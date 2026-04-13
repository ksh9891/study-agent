# Mini IoC Container Exercise

Implement a minimal Inversion of Control container.

## Requirements
1. `BeanDefinition` stores bean metadata (name, class, dependencies)
2. `Container.register(BeanDefinition)` registers a bean definition
3. `Container.getBean(String name)` returns a bean instance
4. Beans are created lazily on first `getBean` call
