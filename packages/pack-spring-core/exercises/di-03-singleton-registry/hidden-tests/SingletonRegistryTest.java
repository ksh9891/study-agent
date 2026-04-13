package com.studyagent.exercise;

import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

public class Greeting {}

class SingletonRegistryTest {
    @Test
    void testFirstGetBeanCreatesInstance() {
        BeanFactory factory = new BeanFactory();
        factory.registerBeanDefinition(new BeanDefinition("greeting", Greeting.class));
        Object bean = factory.getBean("greeting");
        assertNotNull(bean);
        assertTrue(bean instanceof Greeting);
    }

    @Test
    void testSubsequentGetBeanReturnsSameInstance() {
        BeanFactory factory = new BeanFactory();
        factory.registerBeanDefinition(new BeanDefinition("greeting", Greeting.class));
        Object first = factory.getBean("greeting");
        Object second = factory.getBean("greeting");
        assertSame(first, second);
    }

    @Test
    void testUnregisteredBeanThrows() {
        BeanFactory factory = new BeanFactory();
        assertThrows(RuntimeException.class, () -> factory.getBean("nonexistent"));
    }

    @Test
    void testIndependentBeanSlots() {
        BeanFactory factory = new BeanFactory();
        factory.registerBeanDefinition(new BeanDefinition("a", Greeting.class));
        factory.registerBeanDefinition(new BeanDefinition("b", Greeting.class));
        Object a = factory.getBean("a");
        Object b = factory.getBean("b");
        assertNotNull(a);
        assertNotNull(b);
        assertNotSame(a, b);
    }
}
