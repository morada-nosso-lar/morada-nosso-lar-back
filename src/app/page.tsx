'use client';

import React, { useState, useEffect, useTransition } from 'react';
import { CATEGORIAS_VALIDAS } from '@/lib/constants/categorias';

interface ProdutoItem {
  id: number;
  nome: string;
  categoria: string;
  quantidade: number;
  estoqueMinimo: number;
  descricao: string | null;
  pacienteId: number | null;
  createdAt: string;
  updatedAt: string;
}

interface AlertaItem {
  id: number;
  produtoId: number;
  produtoNome: string;
  quantidade: number;
  estoqueMinimo?: number | null;
  mensagem: string;
  lido: boolean;
  createdAt: string;
}

interface LogItem {
  id: number;
  produtoId: number;
  usuarioNome: string;
  acao: string;
  campoAlterado: string | null;
  valorAnterior: string | null;
  valorNovo: string | null;
  descricao: string;
  createdAt: string;
}

export default function EstoquePage() {
  const [produtos, setProdutos] = useState<ProdutoItem[]>([]);
  const [alertas, setAlertas] = useState<AlertaItem[]>([]);
  const [logs, setLogs] = useState<LogItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [savingStatus, setSavingStatus] = useState<{ [id: number]: string }>({});
  const [, startTransition] = useTransition();

  // Filtros
  const [filtroCategoria, setFiltroCategoria] = useState<string>('todas');
  const [busca, setBusca] = useState<string>('');
  const [somenteAlertas, setSomenteAlertas] = useState<boolean>(false);

  // Modal de cadastro
  const [modalAberto, setModalAberto] = useState<boolean>(false);
  const [novoNome, setNovoNome] = useState<string>('');
  const [novaCategoria, setNovaCategoria] = useState<string>(CATEGORIAS_VALIDAS[0]);
  const [novaQuantidade, setNovaQuantidade] = useState<number>(10);
  const [novoEstoqueMinimo, setNovoEstoqueMinimo] = useState<number>(2);
  const [novaDescricao, setNovaDescricao] = useState<string>('');
  const [cadastrando, setCadastrando] = useState<boolean>(false);

  // Autenticação rápida para demonstração caso não esteja logado
  const [autenticado, setAutenticado] = useState<boolean>(true);
  const [emailLogin, setEmailLogin] = useState<string>('admin@moradanossolar.com.br');
  const [senhaLogin, setSenhaLogin] = useState<string>('Admin@2026');
  const [loginMsg, setLoginMsg] = useState<string>('');

  // Carrega produtos, alertas e logs
  const carregarDados = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const resEstoque = await fetch('/api/estoque');
      if (resEstoque.status === 401) {
        setAutenticado(false);
        setLoading(false);
        return;
      }
      const dataEstoque = await resEstoque.json();
      if (dataEstoque.success) {
        setProdutos(dataEstoque.data || []);
        setAutenticado(true);
      } else {
        setErrorMsg(dataEstoque.error || 'Erro ao carregar estoque');
      }

      // Carrega alertas
      const resAlertas = await fetch('/api/estoque/alertas?lido=false');
      if (resAlertas.ok) {
        const dataAlertas = await resAlertas.json();
        setAlertas(dataAlertas.data || []);
      }

      // Carrega logs
      const resLogs = await fetch('/api/estoque/logs?limite=15');
      if (resLogs.ok) {
        const dataLogs = await resLogs.json();
        setLogs(dataLogs.data || []);
      }
    } catch {
      setErrorMsg('Não foi possível conectar à API de estoque.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregarDados();
  }, []);

  // Login de conveniência no painel
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginMsg('Autenticando...');
    try {
      let res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: emailLogin, password: senhaLogin }),
      });

      if (!res.ok) {
        // Tenta registrar caso usuário não exista ainda
        await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: 'Administrador Morada Nosso Lar',
            email: emailLogin,
            password: senhaLogin,
          }),
        });
        res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: emailLogin, password: senhaLogin }),
        });
      }

      if (res.ok) {
        setAutenticado(true);
        setLoginMsg('');
        carregarDados();
      } else {
        setLoginMsg('Credenciais inválidas. Tente novamente.');
      }
    } catch {
      setLoginMsg('Erro ao tentar autenticar.');
    }
  };

  // Alteração de Estoque Mínimo com Salvamento Automático
  const handleAlterarEstoqueMinimo = async (produtoId: number, novoValor: number) => {
    if (isNaN(novoValor) || novoValor < 0) return;

    // Atualização otimista na tela
    setProdutos((prev) =>
      prev.map((p) => (p.id === produtoId ? { ...p, estoqueMinimo: novoValor } : p))
    );

    setSavingStatus((prev) => ({ ...prev, [produtoId]: 'Salvando...' }));

    try {
      const res = await fetch(`/api/estoque/${produtoId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ estoque_minimo: novoValor }),
      });

      const json = await res.json();
      if (res.ok && json.success) {
        setSavingStatus((prev) => ({ ...prev, [produtoId]: 'Salvo automaticamente ✓' }));
        setTimeout(() => {
          setSavingStatus((prev) => {
            const copy = { ...prev };
            delete copy[produtoId];
            return copy;
          });
        }, 2500);

        // Se gerou alerta, atualiza a lista de alertas
        if (json.alerta) {
          setAlertas((prev) => [json.alerta, ...prev.filter((a) => a.id !== json.alerta.id)]);
        }

        // Atualiza logs de auditoria
        const resLogs = await fetch('/api/estoque/logs?limite=15');
        if (resLogs.ok) {
          const dataLogs = await resLogs.json();
          setLogs(dataLogs.data || []);
        }
      } else {
        setSavingStatus((prev) => ({ ...prev, [produtoId]: 'Erro ao salvar' }));
      }
    } catch {
      setSavingStatus((prev) => ({ ...prev, [produtoId]: 'Erro na conexão' }));
    }
  };

  // Alteração rápida de quantidade (auto-save)
  const handleAlterarQuantidade = async (produtoId: number, novaQtd: number) => {
    if (isNaN(novaQtd) || novaQtd < 0) return;

    setProdutos((prev) =>
      prev.map((p) => (p.id === produtoId ? { ...p, quantidade: novaQtd } : p))
    );
    setSavingStatus((prev) => ({ ...prev, [produtoId]: 'Salvando...' }));

    try {
      const res = await fetch(`/api/estoque/${produtoId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quantidade: novaQtd }),
      });

      const json = await res.json();
      if (res.ok && json.success) {
        setSavingStatus((prev) => ({ ...prev, [produtoId]: 'Salvo ✓' }));
        setTimeout(() => {
          setSavingStatus((prev) => {
            const copy = { ...prev };
            delete copy[produtoId];
            return copy;
          });
        }, 2000);

        if (json.alerta) {
          setAlertas((prev) => [json.alerta, ...prev.filter((a) => a.id !== json.alerta.id)]);
        }
      }
    } catch {
      setSavingStatus((prev) => ({ ...prev, [produtoId]: 'Erro ao salvar' }));
    }
  };

  // Cadastro de Novo Produto com Estoque Mínimo Personalizado
  const handleCadastrarProduto = async (e: React.FormEvent) => {
    e.preventDefault();
    setCadastrando(true);

    try {
      const res = await fetch('/api/estoque', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nome: novoNome,
          categoria: novaCategoria,
          quantidade: Number(novaQuantidade),
          estoque_minimo: Number(novoEstoqueMinimo),
          descricao: novaDescricao || null,
        }),
      });

      const json = await res.json();
      if (res.ok && json.success) {
        startTransition(() => {
          setProdutos((prev) => [json.data, ...prev]);
          if (json.alerta) {
            setAlertas((prev) => [json.alerta, ...prev]);
          }
          setModalAberto(false);
          setNovoNome('');
          setNovaQuantidade(10);
          setNovoEstoqueMinimo(2);
          setNovaDescricao('');
        });
      } else {
        alert(json.error || 'Erro ao cadastrar produto');
      }
    } catch {
      alert('Erro ao conectar ao servidor para cadastrar.');
    } finally {
      setCadastrando(false);
    }
  };

  // Filtragem
  const produtosFiltrados = produtos.filter((prod) => {
    const atendeCategoria = filtroCategoria === 'todas' || prod.categoria === filtroCategoria;
    const atendeBusca = prod.nome.toLowerCase().includes(busca.toLowerCase());
    const atendeAlerta = !somenteAlertas || prod.quantidade <= prod.estoqueMinimo;
    return atendeCategoria && atendeBusca && atendeAlerta;
  });

  const totalCriticos = produtos.filter((p) => p.quantidade <= p.estoqueMinimo).length;

  if (!autenticado) {
    return (
      <main style={styles.loginContainer}>
        <div style={styles.loginCard}>
          <div style={styles.brandBadge}>Morada Nosso Lar</div>
          <h2 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '8px', color: '#1e293b' }}>
            Acesso ao Controle de Estoque
          </h2>
          <p style={{ color: '#64748b', fontSize: '14px', marginBottom: '24px' }}>
            Faça login com seu perfil administrativo para gerenciar itens, estoques mínimos personalizados e alertas.
          </p>

          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={styles.label}>E-mail</label>
              <input
                type="email"
                value={emailLogin}
                onChange={(e) => setEmailLogin(e.target.value)}
                style={styles.input}
                required
              />
            </div>
            <div>
              <label style={styles.label}>Senha</label>
              <input
                type="password"
                value={senhaLogin}
                onChange={(e) => setSenhaLogin(e.target.value)}
                style={styles.input}
                required
              />
            </div>

            {loginMsg && <p style={{ color: '#0284c7', fontSize: '13px' }}>{loginMsg}</p>}

            <button type="submit" style={styles.primaryButton}>
              Entrar no Sistema
            </button>
          </form>
        </div>
      </main>
    );
  }

  return (
    <div style={styles.page}>
      {/* Barra de Topo */}
      <header style={styles.header}>
        <div>
          <div style={styles.brandSmall}>Instituição Morada Nosso Lar</div>
          <h1 style={styles.headerTitle}>Gestão de Estoque & Suprimentos</h1>
        </div>

        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <button onClick={() => setModalAberto(true)} style={styles.novoProdutoBtn}>
            + Novo Produto
          </button>
          <button onClick={carregarDados} style={styles.secondaryButton}>
            ↻ Atualizar
          </button>
        </div>
      </header>

      {/* Alertas Críticos Ativos */}
      {totalCriticos > 0 && (
        <section style={styles.alertBanner}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '24px' }}>⚠️</span>
            <div>
              <h3 style={{ fontWeight: 'bold', color: '#991b1b', fontSize: '16px' }}>
                Atenção: {totalCriticos} produto(s) atingiram ou estão abaixo do estoque mínimo personalizado!
              </h3>
              <p style={{ color: '#b91c1c', fontSize: '13px', marginTop: '2px' }}>
                Os alertas acompanham a quantidade mínima que você configurou para cada item específico.
              </p>
            </div>
          </div>
          <button
            onClick={() => setSomenteAlertas(!somenteAlertas)}
            style={somenteAlertas ? styles.filterActiveBtn : styles.filterBtn}
          >
            {somenteAlertas ? 'Ver Todos os Produtos' : 'Filtrar Críticos'}
          </button>
        </section>
      )}

      {/* Cards de Métricas */}
      <section style={styles.metricsGrid}>
        <div style={styles.metricCard}>
          <span style={styles.metricLabel}>Total de Produtos</span>
          <span style={styles.metricValue}>{produtos.length}</span>
        </div>
        <div style={{ ...styles.metricCard, borderLeft: '4px solid #ef4444' }}>
          <span style={styles.metricLabel}>Itens em Alerta Crítico</span>
          <span style={{ ...styles.metricValue, color: totalCriticos > 0 ? '#ef4444' : '#10b981' }}>
            {totalCriticos}
          </span>
        </div>
        <div style={styles.metricCard}>
          <span style={styles.metricLabel}>Total em Unidades</span>
          <span style={styles.metricValue}>
            {produtos.reduce((acc, p) => acc + (p.quantidade || 0), 0)}
          </span>
        </div>
        <div style={styles.metricCard}>
          <span style={styles.metricLabel}>Alertas Registrados</span>
          <span style={styles.metricValue}>{alertas.length}</span>
        </div>
      </section>

      {/* Barra de Filtros e Busca */}
      <div style={styles.toolbar}>
        <div style={{ display: 'flex', gap: '12px', flex: 1, flexWrap: 'wrap' }}>
          <input
            type="text"
            placeholder="Buscar por nome do produto..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            style={{ ...styles.input, maxWidth: '320px' }}
          />

          <select
            value={filtroCategoria}
            onChange={(e) => setFiltroCategoria(e.target.value)}
            style={styles.select}
          >
            <option value="todas">Todas as Categorias</option>
            {CATEGORIAS_VALIDAS.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        <div style={{ fontSize: '13px', color: '#64748b' }}>
          Exibindo <strong>{produtosFiltrados.length}</strong> de {produtos.length} item(ns)
        </div>
      </div>

      {/* Tabela de Produtos */}
      <div style={styles.card}>
        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
            Carregando inventário...
          </div>
        ) : errorMsg ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#ef4444' }}>{errorMsg}</div>
        ) : produtosFiltrados.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
            Nenhum produto encontrado com os filtros atuais.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Produto</th>
                  <th style={styles.th}>Categoria</th>
                  <th style={styles.th}>Estoque Atual</th>
                  <th style={styles.th}>
                    Estoque Mínimo Personalizado
                    <span style={styles.tooltipBadge}>Auto-salva ao alterar</span>
                  </th>
                  <th style={styles.th}>Status de Alerta</th>
                  <th style={styles.th}>Salvamento</th>
                </tr>
              </thead>
              <tbody>
                {produtosFiltrados.map((item) => {
                  const isCritico = item.quantidade <= item.estoqueMinimo;
                  return (
                    <tr
                      key={item.id}
                      style={{
                        ...styles.tr,
                        backgroundColor: isCritico ? '#fef2f2' : 'transparent',
                      }}
                    >
                      {/* Nome do Produto */}
                      <td style={styles.td}>
                        <div style={{ fontWeight: '600', color: '#0f172a' }}>{item.nome}</div>
                        {item.descricao && (
                          <div style={{ fontSize: '12px', color: '#64748b' }}>{item.descricao}</div>
                        )}
                        {item.pacienteId && (
                          <span style={styles.pacienteBadge}>Paciente #{item.pacienteId}</span>
                        )}
                      </td>

                      {/* Categoria */}
                      <td style={styles.td}>
                        <span style={styles.categoriaBadge}>{item.categoria}</span>
                      </td>

                      {/* Quantidade Atual */}
                      <td style={styles.td}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <button
                            onClick={() => handleAlterarQuantidade(item.id, Math.max(0, item.quantidade - 1))}
                            style={styles.stepButton}
                            title="Diminuir quantidade"
                          >
                            -
                          </button>
                          <input
                            type="number"
                            min="0"
                            value={item.quantidade}
                            onChange={(e) => handleAlterarQuantidade(item.id, parseInt(e.target.value) || 0)}
                            style={styles.numInput}
                          />
                          <button
                            onClick={() => handleAlterarQuantidade(item.id, item.quantidade + 1)}
                            style={styles.stepButton}
                            title="Aumentar quantidade"
                          >
                            +
                          </button>
                        </div>
                      </td>

                      {/* Estoque Mínimo Personalizado (com auto-save) */}
                      <td style={styles.td}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <input
                            type="number"
                            min="0"
                            value={item.estoqueMinimo}
                            onChange={(e) =>
                              handleAlterarEstoqueMinimo(item.id, parseInt(e.target.value) || 0)
                            }
                            style={{
                              ...styles.numInput,
                              borderColor: '#3b82f6',
                              backgroundColor: '#f8fafc',
                              fontWeight: 'bold',
                            }}
                            title="Altere o estoque mínimo a qualquer momento — salva automaticamente!"
                          />
                          <span style={{ fontSize: '12px', color: '#64748b' }}>unidades</span>
                        </div>
                      </td>

                      {/* Status */}
                      <td style={styles.td}>
                        {isCritico ? (
                          <span style={styles.criticoBadge}>
                            ⚠️ Estoque Baixo ({item.quantidade} ≤ {item.estoqueMinimo})
                          </span>
                        ) : (
                          <span style={styles.okBadge}>
                            ✓ Adequado ({item.quantidade} &gt; {item.estoqueMinimo})
                          </span>
                        )}
                      </td>

                      {/* Feedback de salvamento */}
                      <td style={styles.td}>
                        <span
                          style={{
                            fontSize: '12px',
                            fontWeight: '500',
                            color: savingStatus[item.id]?.includes('Salvo')
                              ? '#059669'
                              : savingStatus[item.id]?.includes('Erro')
                              ? '#dc2626'
                              : '#6366f1',
                          }}
                        >
                          {savingStatus[item.id] || 'Pronto'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Histórico Recente de Alertas e Auditoria */}
      <div style={styles.bottomGrid}>
        {/* Alertas Ativos */}
        <div style={styles.card}>
          <h3 style={styles.cardTitle}>Histórico de Alertas Disparados</h3>
          <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '16px' }}>
            Alertas que seguiram as quantidades mínimas personalizadas de cada produto:
          </p>

          {alertas.length === 0 ? (
            <p style={{ fontSize: '13px', color: '#10b981' }}>Nenhum alerta pendente no momento.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {alertas.slice(0, 5).map((alerta) => (
                <div key={alerta.id} style={styles.alertaItemCard}>
                  <div style={{ fontWeight: '600', fontSize: '13px', color: '#991b1b' }}>
                    {alerta.produtoNome}
                  </div>
                  <div style={{ fontSize: '12px', color: '#475569', marginTop: '2px' }}>
                    {alerta.mensagem}
                  </div>
                  <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '4px' }}>
                    Registrado em: {new Date(alerta.createdAt).toLocaleString('pt-BR')}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Auditoria de Alterações */}
        <div style={styles.card}>
          <h3 style={styles.cardTitle}>Auditoria de Alterações (LOGs)</h3>
          <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '16px' }}>
            Rastreamento de quem alterou estoques mínimos ou quantidades:
          </p>

          {logs.length === 0 ? (
            <p style={{ fontSize: '13px', color: '#64748b' }}>Nenhum log registrado ainda.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {logs.slice(0, 5).map((log) => (
                <div key={log.id} style={styles.logItemCard}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={styles.logActionBadge}>{log.acao}</span>
                    <span style={{ fontSize: '11px', color: '#94a3b8' }}>
                      {new Date(log.createdAt).toLocaleTimeString('pt-BR')}
                    </span>
                  </div>
                  <div style={{ fontSize: '12px', color: '#334155', marginTop: '4px' }}>
                    {log.descricao}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Modal de Cadastro */}
      {modalAberto && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalContent}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: 'bold', color: '#0f172a' }}>
                Cadastrar Novo Produto com Estoque Mínimo
              </h2>
              <button
                onClick={() => setModalAberto(false)}
                style={{ background: 'transparent', border: 'none', fontSize: '18px', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCadastrarProduto} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={styles.label}>Nome do Produto</label>
                <input
                  type="text"
                  placeholder="Ex: Pomada Nistatina + Óxido de Zinco"
                  value={novoNome}
                  onChange={(e) => setNovoNome(e.target.value)}
                  style={styles.input}
                  required
                />
              </div>

              <div>
                <label style={styles.label}>Categoria Oficial</label>
                <select
                  value={novaCategoria}
                  onChange={(e) => setNovaCategoria(e.target.value)}
                  style={styles.select}
                  required
                >
                  {CATEGORIAS_VALIDAS.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={styles.label}>Quantidade Inicial</label>
                  <input
                    type="number"
                    min="0"
                    value={novaQuantidade}
                    onChange={(e) => setNovaQuantidade(parseInt(e.target.value) || 0)}
                    style={styles.input}
                    required
                  />
                </div>

                <div>
                  <label style={styles.label}>
                    Estoque Mínimo Personalizado
                    <span style={{ display: 'block', fontSize: '11px', color: '#6366f1', fontWeight: 'normal' }}>
                      (Limite para emitir alertas)
                    </span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={novoEstoqueMinimo}
                    onChange={(e) => setNovoEstoqueMinimo(parseInt(e.target.value) || 0)}
                    style={{ ...styles.input, borderColor: '#6366f1' }}
                    required
                  />
                </div>
              </div>

              <div>
                <label style={styles.label}>Descrição (opcional)</label>
                <input
                  type="text"
                  placeholder="Ex: Pomada dermatológica para prevenção de assaduras"
                  value={novaDescricao}
                  onChange={(e) => setNovaDescricao(e.target.value)}
                  style={styles.input}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '16px' }}>
                <button
                  type="button"
                  onClick={() => setModalAberto(false)}
                  style={styles.secondaryButton}
                >
                  Cancelar
                </button>
                <button type="submit" disabled={cadastrando} style={styles.primaryButton}>
                  {cadastrando ? 'Cadastrando...' : 'Salvar Produto'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// Estilos limpos e modernos
const styles: { [key: string]: React.CSSProperties } = {
  page: {
    maxWidth: '1280px',
    margin: '0 auto',
    padding: '32px 24px',
    fontFamily: 'system-ui, -apple-system, sans-serif',
    color: '#0f172a',
    backgroundColor: '#f8fafc',
    minHeight: '100vh',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '28px',
    flexWrap: 'wrap',
    gap: '16px',
  },
  brandSmall: {
    fontSize: '12px',
    fontWeight: '700',
    color: '#3b82f6',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
  headerTitle: {
    fontSize: '26px',
    fontWeight: '800',
    color: '#0f172a',
    marginTop: '4px',
  },
  alertBanner: {
    backgroundColor: '#fee2e2',
    border: '1px solid #fecaca',
    borderRadius: '12px',
    padding: '16px 20px',
    marginBottom: '24px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '12px',
  },
  metricsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
    gap: '16px',
    marginBottom: '24px',
  },
  metricCard: {
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    padding: '20px',
    border: '1px solid #e2e8f0',
    display: 'flex',
    flexDirection: 'column',
    boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
  },
  metricLabel: {
    fontSize: '13px',
    color: '#64748b',
    fontWeight: '500',
  },
  metricValue: {
    fontSize: '28px',
    fontWeight: '800',
    color: '#0f172a',
    marginTop: '6px',
  },
  toolbar: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '16px',
    gap: '16px',
    flexWrap: 'wrap',
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    border: '1px solid #e2e8f0',
    boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
    padding: '20px',
    marginBottom: '24px',
  },
  cardTitle: {
    fontSize: '16px',
    fontWeight: '700',
    color: '#0f172a',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    textAlign: 'left',
  },
  th: {
    padding: '14px 16px',
    fontSize: '12px',
    fontWeight: '700',
    color: '#475569',
    textTransform: 'uppercase',
    borderBottom: '1px solid #e2e8f0',
    letterSpacing: '0.04em',
  },
  tr: {
    borderBottom: '1px solid #f1f5f9',
    transition: 'background-color 0.15s ease',
  },
  td: {
    padding: '14px 16px',
    fontSize: '14px',
    verticalAlign: 'middle',
  },
  tooltipBadge: {
    display: 'inline-block',
    marginLeft: '6px',
    fontSize: '10px',
    color: '#2563eb',
    backgroundColor: '#dbeafe',
    padding: '2px 6px',
    borderRadius: '6px',
    fontWeight: '600',
  },
  pacienteBadge: {
    display: 'inline-block',
    marginTop: '4px',
    fontSize: '11px',
    color: '#7c3aed',
    backgroundColor: '#f5f3ff',
    padding: '2px 8px',
    borderRadius: '999px',
    fontWeight: '600',
  },
  categoriaBadge: {
    display: 'inline-block',
    fontSize: '12px',
    color: '#0369a1',
    backgroundColor: '#e0f2fe',
    padding: '4px 10px',
    borderRadius: '8px',
    fontWeight: '600',
  },
  criticoBadge: {
    display: 'inline-block',
    fontSize: '12px',
    color: '#991b1b',
    backgroundColor: '#fee2e2',
    padding: '4px 10px',
    borderRadius: '8px',
    fontWeight: '700',
  },
  okBadge: {
    display: 'inline-block',
    fontSize: '12px',
    color: '#065f46',
    backgroundColor: '#d1fae5',
    padding: '4px 10px',
    borderRadius: '8px',
    fontWeight: '600',
  },
  numInput: {
    width: '74px',
    padding: '6px 8px',
    borderRadius: '6px',
    border: '1px solid #cbd5e1',
    fontSize: '14px',
    textAlign: 'center',
    outline: 'none',
  },
  stepButton: {
    width: '28px',
    height: '28px',
    borderRadius: '6px',
    border: '1px solid #cbd5e1',
    backgroundColor: '#ffffff',
    cursor: 'pointer',
    fontSize: '16px',
    fontWeight: 'bold',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottomGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
    gap: '24px',
  },
  alertaItemCard: {
    backgroundColor: '#fff1f2',
    border: '1px solid #ffe4e6',
    borderRadius: '8px',
    padding: '12px 14px',
  },
  logItemCard: {
    backgroundColor: '#f8fafc',
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    padding: '10px 14px',
  },
  logActionBadge: {
    fontSize: '10px',
    fontWeight: '700',
    textTransform: 'uppercase',
    color: '#475569',
    backgroundColor: '#e2e8f0',
    padding: '2px 6px',
    borderRadius: '4px',
  },
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 999,
    padding: '20px',
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderRadius: '16px',
    padding: '28px',
    maxWidth: '520px',
    width: '100%',
    boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)',
  },
  label: {
    display: 'block',
    fontSize: '13px',
    fontWeight: '600',
    color: '#334155',
    marginBottom: '6px',
  },
  input: {
    width: '100%',
    padding: '10px 12px',
    borderRadius: '8px',
    border: '1px solid #cbd5e1',
    fontSize: '14px',
    outline: 'none',
    boxSizing: 'border-box',
  },
  select: {
    width: '100%',
    padding: '10px 12px',
    borderRadius: '8px',
    border: '1px solid #cbd5e1',
    fontSize: '14px',
    backgroundColor: '#ffffff',
    outline: 'none',
    boxSizing: 'border-box',
  },
  primaryButton: {
    backgroundColor: '#2563eb',
    color: '#ffffff',
    border: 'none',
    borderRadius: '8px',
    padding: '10px 18px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'background-color 0.2s',
  },
  novoProdutoBtn: {
    backgroundColor: '#059669',
    color: '#ffffff',
    border: 'none',
    borderRadius: '8px',
    padding: '10px 18px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
  },
  secondaryButton: {
    backgroundColor: '#ffffff',
    color: '#334155',
    border: '1px solid #cbd5e1',
    borderRadius: '8px',
    padding: '10px 16px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
  },
  filterBtn: {
    backgroundColor: '#ffffff',
    color: '#b91c1c',
    border: '1px solid #fca5a5',
    borderRadius: '6px',
    padding: '6px 14px',
    fontSize: '13px',
    fontWeight: '600',
    cursor: 'pointer',
  },
  filterActiveBtn: {
    backgroundColor: '#b91c1c',
    color: '#ffffff',
    border: '1px solid #b91c1c',
    borderRadius: '6px',
    padding: '6px 14px',
    fontSize: '13px',
    fontWeight: '600',
    cursor: 'pointer',
  },
  loginContainer: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f1f5f9',
    padding: '24px',
  },
  loginCard: {
    backgroundColor: '#ffffff',
    padding: '36px',
    borderRadius: '16px',
    maxWidth: '440px',
    width: '100%',
    boxShadow: '0 10px 15px -3px rgba(0,0,0,0.07)',
  },
  brandBadge: {
    display: 'inline-block',
    fontSize: '12px',
    fontWeight: '700',
    color: '#2563eb',
    backgroundColor: '#dbeafe',
    padding: '4px 10px',
    borderRadius: '999px',
    marginBottom: '12px',
  },
};
