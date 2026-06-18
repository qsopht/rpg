using System.Threading.Tasks;
using Aetheria.Core;
using Aetheria.Models;
using Aetheria.Services;
using UnityEngine;
using UnityEngine.UIElements;

namespace Aetheria.Views
{
    [RequireComponent(typeof(UIDocument))]
    public class CombatScreen : MonoBehaviour
    {
        public EncounterStartedDto Encounter; // set when transitioning in

        public delegate void Ended(string status, CombatRewardsDto rewards);
        public event Ended OnEnded;

        private CombatService _combat;
        private VisualElement _root;
        private Label _enemyName, _enemyHp, _playerHp, _log;
        private Button _attack, _skill, _defend, _flee;
        private ProgressBar _enemyHpBar, _playerHpBar;
        private int _playerMaxHp;
        private int _enemyMaxHp;

        private async void OnEnable()
        {
            _combat = ServiceLocator.Get<CombatService>();
            _root = GetComponent<UIDocument>().rootVisualElement;
            _enemyName  = _root.Q<Label>("enemyName");
            _enemyHp    = _root.Q<Label>("enemyHp");
            _enemyHpBar = _root.Q<ProgressBar>("enemyHpBar");
            _playerHp   = _root.Q<Label>("playerHp");
            _playerHpBar= _root.Q<ProgressBar>("playerHpBar");
            _log        = _root.Q<Label>("log");
            _attack = _root.Q<Button>("attack");
            _skill  = _root.Q<Button>("skill");
            _defend = _root.Q<Button>("defend");
            _flee   = _root.Q<Button>("flee");

            _attack.clicked += () => DoAction(_combat.Attack(Encounter.encounterId));
            _skill.clicked  += () => DoAction(_combat.Skill(Encounter.encounterId, null));
            _defend.clicked += () => DoAction(_combat.Defend(Encounter.encounterId));
            _flee.clicked   += () => DoAction(_combat.Flee(Encounter.encounterId));

            _enemyName.text = $"{Encounter.enemy.name} (Lv {Encounter.enemy.level})";
            _enemyMaxHp = Encounter.enemy.stats.health;
            _playerMaxHp = Encounter.player.health;
            UpdateBars(Encounter.player.health, Encounter.enemy.stats.health);
            _log.text = "Combat begins.";
        }

        private async void DoAction(Task<CombatActionResultDto> t)
        {
            SetButtons(false);
            try
            {
                var r = await t;
                _log.text = $"R{r.step.round}: you {r.step.playerAction} ({r.step.playerDamage} dmg) → enemy {r.step.enemyAction} ({r.step.enemyDamage} dmg)";
                UpdateBars(r.step.playerHp, r.step.enemyHp);

                if (r.status != "ongoing")
                {
                    OnEnded?.Invoke(r.status, r.rewards);
                    return;
                }
            }
            catch (ApiException ex) { _log.text = $"err: {ex.Code}"; }
            finally { SetButtons(true); }
        }

        private void UpdateBars(int pHp, int eHp)
        {
            _playerHp.text = $"You — {pHp}/{_playerMaxHp}";
            _enemyHp.text  = $"Enemy — {eHp}/{_enemyMaxHp}";
            _playerHpBar.value = _playerMaxHp > 0 ? (float)pHp / _playerMaxHp * 100f : 0f;
            _enemyHpBar.value  = _enemyMaxHp > 0 ? (float)eHp / _enemyMaxHp * 100f : 0f;
        }

        private void SetButtons(bool enabled)
        {
            _attack.SetEnabled(enabled);
            _skill.SetEnabled(enabled);
            _defend.SetEnabled(enabled);
            _flee.SetEnabled(enabled);
        }
    }
}
