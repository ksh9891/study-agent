package com.studyagent.exercise;

import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

@Component
class SampleService {}

@Component("myRepo")
class SampleRepository {}

class NotAComponent {}

class RegistryTest {
    @Test
    void testRegisterAndGet() {
        SimpleBeanDefinitionRegistry registry = new SimpleBeanDefinitionRegistry();
        BeanDefinition def = new BeanDefinition("greeting", String.class);
        registry.register(def);
        BeanDefinition retrieved = registry.get("greeting");
        assertNotNull(retrieved);
        assertEquals("greeting", retrieved.getName());
        assertEquals(String.class, retrieved.getBeanClass());
    }

    @Test
    void testGetReturnsNullForUnknown() {
        SimpleBeanDefinitionRegistry registry = new SimpleBeanDefinitionRegistry();
        assertNull(registry.get("nonexistent"));
    }

    @Test
    void testGetAllReturnsList() {
        SimpleBeanDefinitionRegistry registry = new SimpleBeanDefinitionRegistry();
        registry.register(new BeanDefinition("a", String.class));
        registry.register(new BeanDefinition("b", Integer.class));
        assertEquals(2, registry.getAll().size());
    }

    @Test
    void testDuplicateRegistrationOverwrites() {
        SimpleBeanDefinitionRegistry registry = new SimpleBeanDefinitionRegistry();
        registry.register(new BeanDefinition("x", String.class));
        registry.register(new BeanDefinition("x", Integer.class));
        assertEquals(Integer.class, registry.get("x").getBeanClass());
    }

    @Test
    void testComponentScannerRegistersAnnotatedClasses() {
        SimpleBeanDefinitionRegistry registry = new SimpleBeanDefinitionRegistry();
        ComponentScanner scanner = new ComponentScanner();
        scanner.scan(registry, SampleService.class, SampleRepository.class, NotAComponent.class);
        assertNotNull(registry.get("sampleservice"));
        assertNotNull(registry.get("myRepo"));
        assertNull(registry.get("notacomponent"));
    }

    @Test
    void testComponentScannerUsesAnnotationValue() {
        SimpleBeanDefinitionRegistry registry = new SimpleBeanDefinitionRegistry();
        ComponentScanner scanner = new ComponentScanner();
        scanner.scan(registry, SampleRepository.class);
        BeanDefinition def = registry.get("myRepo");
        assertNotNull(def);
        assertEquals(SampleRepository.class, def.getBeanClass());
    }

    @Test
    void testComponentScannerUsesClassNameWhenNoValue() {
        SimpleBeanDefinitionRegistry registry = new SimpleBeanDefinitionRegistry();
        ComponentScanner scanner = new ComponentScanner();
        scanner.scan(registry, SampleService.class);
        BeanDefinition def = registry.get("sampleservice");
        assertNotNull(def);
        assertEquals(SampleService.class, def.getBeanClass());
    }
}
