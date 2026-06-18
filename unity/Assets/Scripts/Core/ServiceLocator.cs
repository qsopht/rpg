using System;
using System.Collections.Generic;

namespace Aetheria.Core
{
    /// <summary>
    /// Tiny service locator. Tests can swap implementations per-test by calling Register.
    /// Not a substitute for proper DI when the project grows, but enough for solo-dev MVP.
    /// </summary>
    public static class ServiceLocator
    {
        private static readonly Dictionary<Type, object> _services = new();

        public static void Register<T>(T service) where T : class
        {
            _services[typeof(T)] = service;
        }

        public static T Get<T>() where T : class
        {
            if (!_services.TryGetValue(typeof(T), out var s))
                throw new InvalidOperationException($"Service {typeof(T).Name} not registered");
            return (T)s;
        }

        public static T GetOrNull<T>() where T : class
        {
            return _services.TryGetValue(typeof(T), out var s) ? (T)s : null;
        }

        public static void Reset() => _services.Clear();
    }
}
