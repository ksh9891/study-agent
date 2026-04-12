import { describe, it, expect } from "vitest";
import { instantiateSpringDAG } from "../dag-instantiator.js";
import type { EvidenceMap } from "@study-agent/engine-core";

describe("instantiateSpringDAG", () => {
  it("includes required concepts even with low evidence", () => {
    const evidenceMap: EvidenceMap = {
      "spring.ioc.01": [{ file: "A.java", lineStart: 0, lineEnd: 0, pattern: "@Configuration" }],
      "spring.di.02": [],
      "spring.di.03": [],
      "spring.di.04": [],
      "spring.lifecycle.05": [],
      "spring.aop.06": [],
    };

    const dag = instantiateSpringDAG({
      evidenceMap,
      packId: "@study-agent/pack-spring-core",
      repoName: "test",
      rootPath: "/tmp",
    });

    const includedIds = dag.includedConcepts.map((c) => c.conceptId);
    expect(includedIds).toContain("spring.ioc.01");
    expect(includedIds).toContain("spring.di.02");
    expect(includedIds).toContain("spring.di.03");
    expect(includedIds).toContain("spring.di.04");
  });

  it("excludes optional concepts below evidence threshold", () => {
    const evidenceMap: EvidenceMap = {
      "spring.ioc.01": [{ file: "A.java", lineStart: 0, lineEnd: 0, pattern: "@Configuration" }],
      "spring.di.02": [{ file: "A.java", lineStart: 0, lineEnd: 0, pattern: "@Bean" }],
      "spring.di.03": [],
      "spring.di.04": [],
      "spring.lifecycle.05": [],
      "spring.aop.06": [],
    };

    const dag = instantiateSpringDAG({
      evidenceMap,
      packId: "@study-agent/pack-spring-core",
      repoName: "test",
      rootPath: "/tmp",
    });

    const excludedIds = dag.excludedConcepts.map((c) => c.conceptId);
    expect(excludedIds).toContain("spring.lifecycle.05");
    expect(excludedIds).toContain("spring.aop.06");
  });

  it("includes optional concepts with sufficient evidence", () => {
    const evidenceMap: EvidenceMap = {
      "spring.ioc.01": [{ file: "A.java", lineStart: 0, lineEnd: 0, pattern: "@Configuration" }],
      "spring.di.02": [],
      "spring.di.03": [],
      "spring.di.04": [],
      "spring.lifecycle.05": [
        { file: "B.java", lineStart: 0, lineEnd: 0, pattern: "@PostConstruct" },
        { file: "C.java", lineStart: 0, lineEnd: 0, pattern: "@PreDestroy" },
      ],
      "spring.aop.06": [],
    };

    const dag = instantiateSpringDAG({
      evidenceMap,
      packId: "@study-agent/pack-spring-core",
      repoName: "test",
      rootPath: "/tmp",
    });

    const includedIds = dag.includedConcepts.map((c) => c.conceptId);
    expect(includedIds).toContain("spring.lifecycle.05");
  });

  it("produces deterministic topological order", () => {
    const evidenceMap: EvidenceMap = {
      "spring.ioc.01": [{ file: "A.java", lineStart: 0, lineEnd: 0, pattern: "@Configuration" }],
      "spring.di.02": [{ file: "A.java", lineStart: 0, lineEnd: 0, pattern: "@Bean" }],
      "spring.di.03": [],
      "spring.di.04": [{ file: "C.java", lineStart: 0, lineEnd: 0, pattern: "@Autowired" }],
      "spring.lifecycle.05": [],
      "spring.aop.06": [],
    };

    const dag1 = instantiateSpringDAG({ evidenceMap, packId: "p", repoName: "r", rootPath: "/tmp" });
    const dag2 = instantiateSpringDAG({ evidenceMap, packId: "p", repoName: "r", rootPath: "/tmp" });

    expect(dag1.conceptOrder).toEqual(dag2.conceptOrder);
    const iocIdx = dag1.conceptOrder.indexOf("spring.ioc.01");
    const diIdx = dag1.conceptOrder.indexOf("spring.di.02");
    expect(iocIdx).toBeLessThan(diIdx);
  });
});
