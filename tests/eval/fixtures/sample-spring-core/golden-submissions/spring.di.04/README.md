# Constructor-Based Dependency Injection Exercise

Extend the bean factory so it can create beans that depend on other beans via constructor injection.

## Requirements
1. `BeanDefinition` stores bean metadata (name, beanClass)
2. `BeanFactory.registerBeanDefinition(BeanDefinition)` stores the definition
3. `BeanFactory.getBean(String name)`:
   - Returns the cached singleton if present
   - On cache miss, delegates to `ConstructorResolver.resolve(factory, definition)` to build constructor arguments, instantiates the bean, caches it, returns it
4. `ConstructorResolver.resolve(BeanFactory, BeanDefinition)`:
   - Uses the first declared constructor of the bean class
   - For each parameter type, finds the registered BeanDefinition whose `beanClass` matches, then recursively calls `BeanFactory.getBean(depName)`
   - Returns the instantiated bean
5. Throws `RuntimeException` when:
   - `getBean(name)` is called for a name with no registered definition
   - A constructor parameter type has no matching definition
6. **Assumption:** single bean per type. If two definitions have the same `beanClass`, behavior is undefined (no qualifier/primary support).
7. Use public constructors; `setAccessible` is not required.
