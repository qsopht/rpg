using System.Collections.Generic;
using System.Threading.Tasks;
using Aetheria.Core;
using Aetheria.Models;
using Aetheria.Services;
using UnityEngine;
using UnityEngine.UIElements;

namespace Aetheria.Views
{
    [RequireComponent(typeof(UIDocument))]
    public class InventoryScreen : MonoBehaviour
    {
        public string CharacterId;

        private InventoryService _inv;
        private VisualElement _root;
        private ListView _list;
        private List<InventoryEntryDto> _items = new();
        private Label _empty;

        private async void OnEnable()
        {
            _inv = ServiceLocator.Get<InventoryService>();
            _root = GetComponent<UIDocument>().rootVisualElement;
            _list = _root.Q<ListView>("items");
            _empty = _root.Q<Label>("empty");

            await Refresh();
        }

        public async Task Refresh()
        {
            try
            {
                _items = await _inv.List(CharacterId);
                _list.itemsSource = _items;
                _list.makeItem = () =>
                {
                    var row = new VisualElement { style = { flexDirection = FlexDirection.Row, paddingTop = 6, paddingBottom = 6 } };
                    var name = new Label { name = "name", style = { flexGrow = 1 } };
                    var qty = new Label { name = "qty", style = { width = 40 } };
                    var btn = new Button { name = "equip", text = "Use", style = { width = 80 } };
                    row.Add(name); row.Add(qty); row.Add(btn);
                    return row;
                };
                _list.bindItem = (e, i) =>
                {
                    var it = _items[i];
                    e.Q<Label>("name").text = $"{it.name}  ({it.rarity})";
                    e.Q<Label>("qty").text = "x" + it.quantity;
                    var btn = e.Q<Button>("equip");
                    btn.text = it.isEquipped ? "Unequip" : (it.slot == null ? "—" : "Equip");
                    btn.SetEnabled(it.slot != null);
                    btn.clickable = new Clickable(async () =>
                    {
                        try
                        {
                            if (it.isEquipped) await _inv.Unequip(CharacterId, it.slot);
                            else await _inv.Equip(CharacterId, it.id);
                            await Refresh();
                        }
                        catch (ApiException ex) { Debug.LogWarning(ex.Message); }
                    });
                };
                _list.Rebuild();
                _empty.style.display = _items.Count == 0 ? DisplayStyle.Flex : DisplayStyle.None;
            }
            catch (ApiException ex) { Debug.LogError($"inventory: {ex.Code} {ex.Message}"); }
        }
    }
}
