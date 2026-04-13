package com.studyagent.exercise;

import java.util.Map;
import java.util.HashMap;

/**
 * Minimal BeanFactory:
 *  - registerBeanDefinition(BeanDefinition) stores metadata
 *  - getBean(name) returns cached singleton; on cache miss, instantiates via reflection
 *    (Class.getDeclaredConstructor().newInstance()) then caches
 *  - throws RuntimeException (or IllegalStateException) when no BeanDefinition is registered for name
 */
public class BeanFactory {
    // TODO: Implement registerBeanDefinition + getBean with lazy instantiation + singleton caching
}
