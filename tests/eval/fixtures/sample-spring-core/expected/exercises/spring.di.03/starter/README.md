# Singleton Bean Registry Exercise

Implement a minimal BeanFactory that lazily creates beans and caches them as singletons.

## Requirements
1. `BeanDefinition` stores bean metadata (name, beanClass)
2. `SingletonBeanRegistry` holds a Map<String, Object> of already-instantiated beans with `getSingleton`, `registerSingleton`, `containsSingleton`
3. `BeanFactory.registerBeanDefinition(BeanDefinition)` stores the definition
4. `BeanFactory.getBean(String name)`:
   - Returns the cached singleton if one exists for `name`
   - Otherwise: looks up the BeanDefinition, instantiates the bean class via reflection (`getDeclaredConstructor().newInstance()`), caches it in the registry, and returns it
5. `BeanFactory.getBean` throws `RuntimeException` (or a subclass) when no definition is registered for the given name
6. Use only public zero-arg constructors (no setAccessible needed for this exercise)
