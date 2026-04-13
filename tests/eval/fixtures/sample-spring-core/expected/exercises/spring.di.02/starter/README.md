# Bean Registration and Component Scanning Exercise

Implement a bean definition registry and a component scanner.

## Requirements
1. `BeanDefinitionRegistry` interface with `register(BeanDefinition)`, `get(String name)`, `getAll()` methods
2. `SimpleBeanDefinitionRegistry` implements the interface using a HashMap
3. `@Component` annotation is provided — do not modify it
4. `ComponentScanner.scan(registry, candidates...)` finds @Component classes, creates BeanDefinitions, and registers them
5. If `@Component(value="myName")` is given, use that as the bean name; otherwise use the simple class name in lowercase
6. Duplicate registrations overwrite the previous entry
