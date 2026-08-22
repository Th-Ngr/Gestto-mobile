# GESTTO Finance — Mapa de Módulos Atual

Este documento registra a localização aproximada das responsabilidades no `script.js` atual.

| Área | Faixa aproximada | Principais responsabilidades |
|---|---:|---|
| Firebase/configuração | início do arquivo | Auth, Firestore, configuração |
| Cadastro | ~100 | criação de usuário |
| Atualização/manutenção | ~130–350 | listener de sistema, versão, manutenção |
| Tema/navegação | ~500–820 | tema, navegação, botões |
| Lançamentos | ~820–1560 | carga, projeção, pendências, CRUD |
| Perfil | ~1580–1930 | perfil, PWA, logout |
| Modelos fixos | ~1980–2180 | CRUD e lançamento mensal |
| Serviços | ~2180–2490 | CRUD, sugestões e preenchimento |
| Gráficos | ~2490–2620 | Chart.js/dashboard |
| Categorias | ~2620–2795 | análise, regras e identificação |
| Autenticação/UI | ~2795–2960 | login/cadastro/novidades/sobre |
| Status/pagamento | ~2970–3135 | seleção de status e pagamento |

> As linhas são aproximadas e devem ser atualizadas caso o arquivo seja alterado.

## Próxima etapa

Transformar cada área acima em um documento funcional com:

- entradas;
- saídas;
- funções;
- Firestore envolvido;
- elementos DOM;
- regras de negócio;
- dependências;
- riscos;
- testes necessários.
