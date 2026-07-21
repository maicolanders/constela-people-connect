import nx from "@nx/eslint-plugin";

export default [
    ...nx.configs["flat/base"],
    ...nx.configs["flat/typescript"],
    ...nx.configs["flat/javascript"],
    {
        ignores: [
            "**/dist",
            "**/out-tsc"
        ]
    },
    {
        files: [
            "**/*.ts",
            "**/*.tsx",
            "**/*.js",
            "**/*.jsx"
        ],
        rules: {
            "@nx/enforce-module-boundaries": [
                "error",
                {
                    enforceBuildableLibDependency: true,
                    allow: [
                        "^.*/eslint(\\.base)?\\.config\\.[cm]?[jt]s$"
                    ],
                    depConstraints: [
                        // scope: frontend y backend nunca se importan entre sí; shared es neutral.
                        {
                            sourceTag: "scope:web",
                            onlyDependOnLibsWithTags: ["scope:web", "scope:shared"]
                        },
                        {
                            sourceTag: "scope:api",
                            onlyDependOnLibsWithTags: ["scope:api", "scope:shared"]
                        },
                        {
                            sourceTag: "scope:shared",
                            onlyDependOnLibsWithTags: ["scope:shared"]
                        },
                        // type: capas dentro de un mismo scope (feature -> data-access/ui/util -> util).
                        {
                            sourceTag: "type:app",
                            onlyDependOnLibsWithTags: ["type:feature", "type:data-access", "type:ui", "type:util"]
                        },
                        {
                            sourceTag: "type:feature",
                            onlyDependOnLibsWithTags: ["type:feature", "type:data-access", "type:ui", "type:util"]
                        },
                        {
                            sourceTag: "type:data-access",
                            onlyDependOnLibsWithTags: ["type:data-access", "type:util"]
                        },
                        {
                            sourceTag: "type:ui",
                            onlyDependOnLibsWithTags: ["type:ui", "type:util"]
                        },
                        {
                            sourceTag: "type:util",
                            onlyDependOnLibsWithTags: ["type:util"]
                        },
                        // domain: cada dominio funcional solo depende de sí mismo + domain:shared,
                        // salvo las excepciones explícitas documentadas en CLAUDE.md/plan de construcción.
                        // Al crear los dominios de negocio de las Fases 1-10, agregar aquí su entrada.
                        {
                            sourceTag: "domain:shared",
                            onlyDependOnLibsWithTags: ["domain:shared"]
                        },
                        {
                            sourceTag: "domain:auth",
                            onlyDependOnLibsWithTags: ["domain:auth", "domain:shared"]
                        },
                        {
                            sourceTag: "domain:comunidad",
                            onlyDependOnLibsWithTags: ["domain:comunidad", "domain:shared", "domain:auth"]
                        },
                        {
                            sourceTag: "domain:periodo-censal",
                            onlyDependOnLibsWithTags: ["domain:periodo-censal", "domain:shared", "domain:auth"]
                        },
                        {
                            sourceTag: "domain:catalogo",
                            onlyDependOnLibsWithTags: ["domain:catalogo", "domain:shared", "domain:auth"]
                        },
                        // Fase 1+: poblacion depende de georreferenciacion/vivienda (hogar->ubicacion/vivienda).
                        {
                            sourceTag: "domain:poblacion",
                            onlyDependOnLibsWithTags: [
                                "domain:poblacion", "domain:shared", "domain:auth", "domain:catalogo",
                                "domain:periodo-censal", "domain:comunidad",
                                "domain:georreferenciacion", "domain:vivienda"
                            ]
                        },
                        {
                            sourceTag: "domain:demografia",
                            onlyDependOnLibsWithTags: [
                                "domain:demografia", "domain:shared", "domain:auth", "domain:poblacion",
                                "domain:periodo-censal"
                            ]
                        },
                        {
                            sourceTag: "domain:georreferenciacion",
                            onlyDependOnLibsWithTags: [
                                "domain:georreferenciacion", "domain:shared", "domain:auth", "domain:catalogo",
                                "domain:periodo-censal"
                            ]
                        },
                        {
                            sourceTag: "domain:vivienda",
                            onlyDependOnLibsWithTags: [
                                "domain:vivienda", "domain:shared", "domain:auth", "domain:poblacion",
                                "domain:catalogo", "domain:periodo-censal"
                            ]
                        },
                        {
                            sourceTag: "domain:educacion",
                            onlyDependOnLibsWithTags: [
                                "domain:educacion", "domain:shared", "domain:auth", "domain:poblacion",
                                "domain:catalogo", "domain:periodo-censal"
                            ]
                        },
                        {
                            sourceTag: "domain:economia",
                            onlyDependOnLibsWithTags: [
                                "domain:economia", "domain:shared", "domain:auth", "domain:poblacion",
                                "domain:catalogo", "domain:periodo-censal"
                            ]
                        },
                        {
                            sourceTag: "domain:migracion",
                            onlyDependOnLibsWithTags: [
                                "domain:migracion", "domain:shared", "domain:auth", "domain:poblacion",
                                "domain:georreferenciacion", "domain:catalogo", "domain:periodo-censal"
                            ]
                        },
                        {
                            sourceTag: "domain:etnia-vulnerabilidad",
                            onlyDependOnLibsWithTags: [
                                "domain:etnia-vulnerabilidad", "domain:shared", "domain:auth", "domain:poblacion",
                                "domain:catalogo", "domain:periodo-censal"
                            ]
                        },
                        {
                            sourceTag: "domain:recursos",
                            onlyDependOnLibsWithTags: [
                                "domain:recursos", "domain:shared", "domain:auth", "domain:comunidad",
                                "domain:periodo-censal"
                            ]
                        },
                        {
                            sourceTag: "domain:administracion",
                            onlyDependOnLibsWithTags: [
                                "domain:administracion", "domain:shared", "domain:auth"
                            ]
                        },
                        {
                            // Fase 14: portal de autogestión del habitante, compone endpoints
                            // ya existentes de otros dominios vía HTTP directo (mismo criterio
                            // que domain:administracion) — no necesita depender de ningún otro
                            // dominio backend.
                            sourceTag: "domain:autogestion",
                            onlyDependOnLibsWithTags: [
                                "domain:autogestion", "domain:shared"
                            ]
                        }
                    ]
                }
            ]
        }
    },
    {
        files: [
            "**/*.ts",
            "**/*.tsx",
            "**/*.cts",
            "**/*.mts",
            "**/*.js",
            "**/*.jsx",
            "**/*.cjs",
            "**/*.mjs"
        ],
        // Override or add rules here
        rules: {}
    }
];
