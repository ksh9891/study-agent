package com.studyagent.exercise;

import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

class ContainerTest {
    @Test
    void testRegisterAndGetBean() {
        Container container = new Container();
        BeanDefinition def = new BeanDefinition("greeting", String.class);
        container.register(def);
        assertNotNull(container.getBean("greeting"));
    }

    @Test
    void testBeanDefinitionHasName() {
        BeanDefinition def = new BeanDefinition("myBean", Object.class);
        assertEquals("myBean", def.getName());
        assertEquals(Object.class, def.getBeanClass());
    }

    @Test
    void testGetBeanReturnsNullForUnknown() {
        Container container = new Container();
        assertNull(container.getBean("nonexistent"));
    }

    @Test
    void testSingletonBehavior() {
        Container container = new Container();
        container.register(new BeanDefinition("obj", Object.class));
        Object first = container.getBean("obj");
        Object second = container.getBean("obj");
        assertSame(first, second);
    }
}
