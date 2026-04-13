package com.studyagent.exercise;

import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

class LeafC {}

class MidB {
    final LeafC c;
    public MidB(LeafC c) { this.c = c; }
}

class TopA {
    final MidB b;
    public TopA(MidB b) { this.b = b; }
}

class Standalone {}

class ConstructorResolverTest {
    @Test
    void testZeroArgBean() {
        BeanFactory factory = new BeanFactory();
        factory.registerBeanDefinition(new BeanDefinition("standalone", Standalone.class));
        Object bean = factory.getBean("standalone");
        assertNotNull(bean);
        assertTrue(bean instanceof Standalone);
    }

    @Test
    void testSingleDependency() {
        BeanFactory factory = new BeanFactory();
        factory.registerBeanDefinition(new BeanDefinition("c", LeafC.class));
        factory.registerBeanDefinition(new BeanDefinition("b", MidB.class));
        MidB b = (MidB) factory.getBean("b");
        assertNotNull(b);
        assertNotNull(b.c);
    }

    @Test
    void testChainedDependency() {
        BeanFactory factory = new BeanFactory();
        factory.registerBeanDefinition(new BeanDefinition("c", LeafC.class));
        factory.registerBeanDefinition(new BeanDefinition("b", MidB.class));
        factory.registerBeanDefinition(new BeanDefinition("a", TopA.class));
        TopA a = (TopA) factory.getBean("a");
        assertNotNull(a);
        assertNotNull(a.b);
        assertNotNull(a.b.c);
    }

    @Test
    void testUnresolvedDependencyThrows() {
        BeanFactory factory = new BeanFactory();
        // Register A (which needs B) but do NOT register B
        factory.registerBeanDefinition(new BeanDefinition("a", TopA.class));
        assertThrows(RuntimeException.class, () -> factory.getBean("a"));
    }
}
