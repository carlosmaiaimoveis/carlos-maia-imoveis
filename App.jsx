import React, { useState, useMemo, useEffect } from "react";
import {
  Search,
  MapPin,
  Bed,
  Bath,
  Maximize,
  Car,
  X,
  ChevronLeft,
  ChevronRight,
  Phone,
  Mail,
  MessageCircle,
  Instagram,
  Facebook,
  Award,
  Handshake,
  Home,
  CheckCircle2,
  ArrowRight,
  Plus,
  Minus,
} from "lucide-react";

// ---------- CONFIGURAÇÃO DA PLANILHA GOOGLE SHEETS ----------
// Esse é o ID da planilha do Carlos Maia Imóveis.
// Pra trocar de planilha, basta mudar esse ID e o nome da aba abaixo.
const SHEETS_ID = "1YYL8-OMgM4T5k1Zh6V8Jdc9VZWDN5Np_LdsIggA1Lv0";
const SHEETS_ABA = "imoveis";
const SHEETS_URL = `https://docs.google.com/spreadsheets/d/${SHEETS_ID}/gviz/tq?tqx=out:csv&sheet=${SHEETS_ABA}`;

const TIPOS = ["Todos", "Casa", "Apartamento", "Terreno", "Rural"];

const formatarPreco = (valor) =>
  new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  }).format(valor);

// ---------- PARSER DE CSV (lê os dados da planilha) ----------
// Função que transforma o texto CSV (formato exportado pelo Google Sheets)
// numa lista de objetos JavaScript que o site consegue usar.
function parseCSV(texto) {
  const linhas = [];
  let atual = [];
  let campo = "";
  let dentroDeAspas = false;

  for (let i = 0; i < texto.length; i++) {
    const c = texto[i];
    const proximo = texto[i + 1];

    if (c === '"') {
      if (dentroDeAspas && proximo === '"') {
        campo += '"';
        i++;
      } else {
        dentroDeAspas = !dentroDeAspas;
      }
    } else if (c === "," && !dentroDeAspas) {
      atual.push(campo);
      campo = "";
    } else if ((c === "\n" || c === "\r") && !dentroDeAspas) {
      if (campo !== "" || atual.length > 0) {
        atual.push(campo);
        linhas.push(atual);
        atual = [];
        campo = "";
      }
      if (c === "\r" && proximo === "\n") i++;
    } else {
      campo += c;
    }
  }
  if (campo !== "" || atual.length > 0) {
    atual.push(campo);
    linhas.push(atual);
  }
  return linhas;
}

// Converte uma lista de linhas em uma lista de imóveis
function linhasParaImoveis(linhas) {
  if (linhas.length < 2) return [];
  const cabecalho = linhas[0].map((c) => c.trim().toLowerCase());
  const indice = (nome) => cabecalho.indexOf(nome);

  const imoveis = [];
  for (let i = 1; i < linhas.length; i++) {
    const linha = linhas[i];
    if (linha.every((c) => c.trim() === "")) continue;

    const obter = (nome) => {
      const idx = indice(nome);
      return idx >= 0 && linha[idx] ? linha[idx].trim() : "";
    };

    const ativo = obter("ativo").toUpperCase();
    if (ativo !== "SIM" && ativo !== "TRUE" && ativo !== "1") continue;

    const fotos = [];
    for (let n = 1; n <= 8; n++) {
      const url = obter(`foto${n}`);
      if (url && url.startsWith("http")) fotos.push(url);
    }

    const caracteristicasStr = obter("caracteristicas");
    const caracteristicas = caracteristicasStr
      ? caracteristicasStr.split(",").map((c) => c.trim()).filter(Boolean)
      : [];

    imoveis.push({
      id: parseInt(obter("id"), 10) || i,
      titulo: obter("titulo"),
      cidade: obter("cidade"),
      bairro: obter("bairro"),
      tipo: obter("tipo"),
      preco: parseFloat(obter("preco")) || 0,
      quartos: parseInt(obter("quartos"), 10) || 0,
      banheiros: parseInt(obter("banheiros"), 10) || 0,
      vagas: parseInt(obter("vagas"), 10) || 0,
      area: parseFloat(obter("area")) || 0,
      destaque: ["SIM", "TRUE", "1"].includes(obter("destaque").toUpperCase()),
      descricao: obter("descricao"),
      caracteristicas,
      fotos,
    });
  }
  return imoveis;
}

// ---------- COMPONENTE PRINCIPAL ----------
export default function App() {
  const [filtros, setFiltros] = useState({
    cidade: "Todas",
    tipo: "Todos",
    quartos: 0,
    precoMax: 1500000,
    busca: "",
  });
  const [imovelSelecionado, setImovelSelecionado] = useState(null);
  const [menuAberto, setMenuAberto] = useState(false);
  const [faqAberto, setFaqAberto] = useState(null);
  const [formEnviado, setFormEnviado] = useState(false);

  // Estado dos imóveis carregados da planilha
  const [imoveis, setImoveis] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(null);

  // Carregar imóveis da planilha quando o site abre
  useEffect(() => {
    fetch(SHEETS_URL)
      .then((res) => {
        if (!res.ok) throw new Error("Não foi possível ler a planilha");
        return res.text();
      })
      .then((csv) => {
        const linhas = parseCSV(csv);
        const lista = linhasParaImoveis(linhas);
        setImoveis(lista);
        setCarregando(false);
      })
      .catch((e) => {
        console.error("Erro ao carregar imóveis:", e);
        setErro(e.message);
        setCarregando(false);
      });
  }, []);

  // Lista de cidades calculada a partir dos imóveis carregados
  const CIDADES = useMemo(
    () => ["Todas", ...new Set(imoveis.map((i) => i.cidade).filter(Boolean))],
    [imoveis]
  );

  const imoveisFiltrados = useMemo(() => {
    return imoveis.filter((i) => {
      if (filtros.cidade !== "Todas" && i.cidade !== filtros.cidade) return false;
      if (filtros.tipo !== "Todos" && i.tipo !== filtros.tipo) return false;
      if (filtros.quartos > 0 && i.quartos < filtros.quartos) return false;
      if (i.preco > filtros.precoMax) return false;
      if (
        filtros.busca &&
        !`${i.titulo} ${i.bairro} ${i.cidade}`
          .toLowerCase()
          .includes(filtros.busca.toLowerCase())
      )
        return false;
      return true;
    });
  }, [imoveis, filtros]);

  const scrollTo = (id) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
    setMenuAberto(false);
  };

  return (
    <div className="min-h-screen bg-stone-50 text-stone-900 font-serif">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,300;9..144,400;9..144,500;9..144,600;9..144,700&family=Inter:wght@300;400;500;600&display=swap');
        .font-display { font-family: 'Fraunces', Georgia, serif; font-optical-sizing: auto; }
        .font-body { font-family: 'Inter', system-ui, sans-serif; }
        html { scroll-behavior: smooth; }
        .grain {
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.4'/%3E%3C/svg%3E");
        }
      `}</style>

      {/* ============ HEADER ============ */}
      <header className="fixed top-0 left-0 right-0 z-40 bg-stone-50/85 backdrop-blur-md border-b border-stone-200/60">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <button onClick={() => scrollTo("topo")} className="flex items-center gap-3 group">
            <div className="w-10 h-10 border border-[#b85c3d] flex items-center justify-center font-display text-[#b85c3d] text-base leading-none">
              <span>C</span><span className="italic -ml-0.5">M</span>
            </div>
            <div className="font-display leading-tight text-left">
              <div className="font-semibold text-stone-900 text-base">Carlos Maia</div>
              <div className="text-[10px] text-stone-500 -mt-0.5 font-body tracking-[0.2em] uppercase">Imóveis</div>
            </div>
          </button>

          <nav className="hidden md:flex items-center gap-8 font-body text-sm">
            <button onClick={() => scrollTo("imoveis")} className="text-stone-600 hover:text-stone-900 transition">Imóveis</button>
            <button onClick={() => scrollTo("sobre")} className="text-stone-600 hover:text-stone-900 transition">Sobre</button>
            <button onClick={() => scrollTo("processo")} className="text-stone-600 hover:text-stone-900 transition">Processo</button>
            <button onClick={() => scrollTo("faq")} className="text-stone-600 hover:text-stone-900 transition">Dúvidas</button>
            <button
              onClick={() => scrollTo("contato")}
              className="bg-stone-900 text-stone-50 px-5 py-2.5 rounded-full hover:bg-stone-700 transition font-medium"
            >
              Falar agora
            </button>
          </nav>

          <button className="md:hidden text-stone-900" onClick={() => setMenuAberto(!menuAberto)}>
            {menuAberto ? <X size={24} /> : <div className="space-y-1.5"><div className="w-6 h-px bg-stone-900"/><div className="w-6 h-px bg-stone-900"/><div className="w-6 h-px bg-stone-900"/></div>}
          </button>
        </div>

        {menuAberto && (
          <div className="md:hidden border-t border-stone-200 bg-stone-50 px-6 py-4 space-y-3 font-body">
            <button onClick={() => scrollTo("imoveis")} className="block text-stone-700">Imóveis</button>
            <button onClick={() => scrollTo("sobre")} className="block text-stone-700">Sobre</button>
            <button onClick={() => scrollTo("processo")} className="block text-stone-700">Processo</button>
            <button onClick={() => scrollTo("faq")} className="block text-stone-700">Dúvidas</button>
            <button onClick={() => scrollTo("contato")} className="block bg-stone-900 text-stone-50 px-5 py-2.5 rounded-full text-center">Falar agora</button>
          </div>
        )}
      </header>

      {/* ============ HERO ============ */}
      <section id="topo" className="pt-32 pb-20 md:pt-40 md:pb-28 px-6 relative overflow-hidden">
        <div className="absolute inset-0 grain opacity-[0.03] pointer-events-none"/>
        <div className="max-w-7xl mx-auto relative">
          <div className="grid md:grid-cols-12 gap-8 md:gap-12 items-center">
            <div className="md:col-span-7">
              <div className="inline-flex items-center gap-2 bg-stone-900/5 border border-stone-900/10 rounded-full px-4 py-1.5 mb-8 font-body text-xs tracking-wider uppercase text-stone-700">
                <span className="w-1.5 h-1.5 bg-[#b85c3d] rounded-full animate-pulse"/>
                Atendendo Divinópolis e região
              </div>

              <h1 className="font-display text-5xl md:text-7xl lg:text-8xl leading-[0.95] tracking-tight text-stone-900 mb-6">
                O imóvel certo,
                <br/>
                <span className="italic font-light text-[#b85c3d]">sem rodeios.</span>
              </h1>

              <p className="font-body text-lg md:text-xl text-stone-600 max-w-xl leading-relaxed mb-10">
                Imóveis selecionados pessoalmente em Divinópolis e região, com a transparência de quem mora aqui há décadas e conhece cada bairro de perto.
              </p>

              <div className="flex flex-col sm:flex-row gap-4">
                <button
                  onClick={() => scrollTo("imoveis")}
                  className="bg-stone-900 text-stone-50 px-7 py-4 rounded-full hover:bg-stone-700 transition font-body font-medium flex items-center justify-center gap-2 group"
                >
                  Ver imóveis disponíveis
                  <ArrowRight size={18} className="group-hover:translate-x-1 transition"/>
                </button>
                <button
                  onClick={() => scrollTo("contato")}
                  className="border border-stone-300 text-stone-900 px-7 py-4 rounded-full hover:border-stone-900 transition font-body font-medium"
                >
                  Conversar com o Carlos
                </button>
              </div>

              <div className="flex flex-wrap items-center gap-x-8 gap-y-3 mt-12 font-body text-sm text-stone-500">
                <div className="flex items-center gap-2"><Award size={16}/> CRECI registrado</div>
                <div className="flex items-center gap-2"><Handshake size={16}/> Atendimento pessoal</div>
                <div className="flex items-center gap-2"><MapPin size={16}/> Divinópolis/MG</div>
              </div>
            </div>

            <div className="md:col-span-5 relative">
              <div className="relative aspect-[4/5] rounded-sm overflow-hidden bg-stone-200">
                <img
                  src="https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1200&auto=format&fit=crop&q=80"
                  alt="Casa em destaque"
                  loading="eager"
                  className="w-full h-full object-cover"
                  onError={(e) => { e.currentTarget.style.display = 'none'; }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-stone-900/60 via-stone-900/20 to-transparent"/>
                <div className="absolute bottom-6 left-6 right-6 text-stone-50">
                  <div className="font-body text-xs uppercase tracking-widest opacity-80 mb-1">Em destaque</div>
                  <div className="font-display text-2xl font-medium">Casa moderna no Sidil</div>
                  <div className="font-body text-sm opacity-90">a partir de R$ 890.000</div>
                </div>
              </div>
              <div className="absolute -bottom-6 -left-6 w-32 h-32 bg-[#f4d5c6] rounded-sm -z-10 hidden md:block"/>
              <div className="absolute -top-6 -right-6 w-24 h-24 border border-[#b85c3d]/30 rounded-sm -z-10 hidden md:block"/>
            </div>
          </div>
        </div>
      </section>

      {/* ============ FAIXA DE CONFIANÇA ============ */}
      <section className="border-y border-stone-200 bg-stone-100/50 py-8 px-6">
        <div className="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
          <div>
            <div className="font-display text-3xl md:text-4xl font-medium text-stone-900">+35</div>
            <div className="font-body text-xs uppercase tracking-widest text-stone-500 mt-1">anos de mercado</div>
          </div>
          <div>
            <div className="font-display text-3xl md:text-4xl font-medium text-stone-900">100%</div>
            <div className="font-body text-xs uppercase tracking-widest text-stone-500 mt-1">imóveis verificados</div>
          </div>
          <div>
            <div className="font-display text-3xl md:text-4xl font-medium text-stone-900">CRECI</div>
            <div className="font-body text-xs uppercase tracking-widest text-stone-500 mt-1">corretor registrado</div>
          </div>
          <div>
            <div className="font-display text-3xl md:text-4xl font-medium text-stone-900">1:1</div>
            <div className="font-body text-xs uppercase tracking-widest text-stone-500 mt-1">atendimento direto</div>
          </div>
        </div>
      </section>

      {/* ============ LISTAGEM COM FILTROS ============ */}
      <section id="imoveis" className="py-20 md:py-28 px-6 bg-stone-100/40">
        <div className="max-w-7xl mx-auto">
          <div className="mb-12">
            <div className="font-body text-xs uppercase tracking-widest text-stone-500 mb-3">Catálogo completo</div>
            <h2 className="font-display text-4xl md:text-5xl text-stone-900 leading-tight">
              Encontre o seu <span className="italic font-light text-[#b85c3d]">próximo lar</span>
            </h2>
          </div>

          {/* Filtros */}
          <div className="bg-stone-50 border border-stone-200 rounded-sm p-6 mb-10">
            <div className="grid md:grid-cols-12 gap-4">
              <div className="md:col-span-4 relative">
                <label className="font-body text-xs uppercase tracking-widest text-stone-500 mb-2 block">Buscar</label>
                <Search size={16} className="absolute left-3 top-[42px] text-stone-400"/>
                <input
                  type="text"
                  placeholder="Bairro, cidade..."
                  value={filtros.busca}
                  onChange={(e) => setFiltros({ ...filtros, busca: e.target.value })}
                  className="w-full pl-10 pr-3 py-2.5 border border-stone-300 rounded-sm font-body text-sm focus:outline-none focus:border-stone-900 bg-stone-50"
                />
              </div>
              <div className="md:col-span-2">
                <label className="font-body text-xs uppercase tracking-widest text-stone-500 mb-2 block">Cidade</label>
                <select
                  value={filtros.cidade}
                  onChange={(e) => setFiltros({ ...filtros, cidade: e.target.value })}
                  className="w-full px-3 py-2.5 border border-stone-300 rounded-sm font-body text-sm focus:outline-none focus:border-stone-900 bg-stone-50"
                >
                  {CIDADES.map((c) => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="font-body text-xs uppercase tracking-widest text-stone-500 mb-2 block">Tipo</label>
                <select
                  value={filtros.tipo}
                  onChange={(e) => setFiltros({ ...filtros, tipo: e.target.value })}
                  className="w-full px-3 py-2.5 border border-stone-300 rounded-sm font-body text-sm focus:outline-none focus:border-stone-900 bg-stone-50"
                >
                  {TIPOS.map((t) => <option key={t}>{t}</option>)}
                </select>
              </div>
              <div className="md:col-span-1">
                <label className="font-body text-xs uppercase tracking-widest text-stone-500 mb-2 block">Quartos</label>
                <select
                  value={filtros.quartos}
                  onChange={(e) => setFiltros({ ...filtros, quartos: Number(e.target.value) })}
                  className="w-full px-3 py-2.5 border border-stone-300 rounded-sm font-body text-sm focus:outline-none focus:border-stone-900 bg-stone-50"
                >
                  <option value={0}>Todos</option>
                  <option value={1}>1+</option>
                  <option value={2}>2+</option>
                  <option value={3}>3+</option>
                  <option value={4}>4+</option>
                </select>
              </div>
              <div className="md:col-span-3">
                <label className="font-body text-xs uppercase tracking-widest text-stone-500 mb-2 block">
                  Até {formatarPreco(filtros.precoMax)}
                </label>
                <input
                  type="range"
                  min={200000}
                  max={1500000}
                  step={50000}
                  value={filtros.precoMax}
                  onChange={(e) => setFiltros({ ...filtros, precoMax: Number(e.target.value) })}
                  className="w-full accent-stone-900 mt-3"
                />
              </div>
            </div>
            <div className="mt-4 font-body text-sm text-stone-500">
              {carregando
                ? "carregando..."
                : `${imoveisFiltrados.length} ${imoveisFiltrados.length === 1 ? "imóvel encontrado" : "imóveis encontrados"}`}
            </div>
          </div>

          {/* Grid */}
          {carregando ? (
            <div className="text-center py-20 font-body text-stone-500">
              <div className="inline-block w-10 h-10 border-2 border-stone-300 border-t-[#b85c3d] rounded-full animate-spin mb-4"/>
              <div className="font-display text-xl text-stone-700">Carregando imóveis...</div>
            </div>
          ) : erro ? (
            <div className="text-center py-20 font-body text-stone-500">
              <div className="font-display text-2xl text-stone-700 mb-2">Não conseguimos carregar os imóveis</div>
              <p>Por favor tente novamente em alguns minutos, ou entre em contato pelo WhatsApp.</p>
            </div>
          ) : imoveis.length === 0 ? (
            <div className="text-center py-20 font-body text-stone-500">
              <div className="font-display text-2xl text-stone-700 mb-2">Em breve, novos imóveis</div>
              <p>Estamos atualizando nosso catálogo. Entre em contato pelo WhatsApp para conhecer as oportunidades disponíveis.</p>
            </div>
          ) : imoveisFiltrados.length === 0 ? (
            <div className="text-center py-20 font-body text-stone-500">
              <div className="font-display text-2xl text-stone-700 mb-2">Nenhum imóvel encontrado</div>
              <p>Ajuste os filtros para ver mais opções, ou entre em contato — talvez tenhamos algo perfeito ainda fora do site.</p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
              {imoveisFiltrados.map((imovel) => (
                <CardImovel key={imovel.id} imovel={imovel} onClick={() => setImovelSelecionado(imovel)} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ============ SOBRE ============ */}
      <section id="sobre" className="py-20 md:py-28 px-6">
        <div className="max-w-7xl mx-auto grid md:grid-cols-12 gap-12 items-center">
          <div className="md:col-span-5">
            <div className="aspect-[4/5] rounded-sm overflow-hidden bg-stone-200">
              <img
                src="https://images.unsplash.com/photo-1560250097-0b93528c311a?w=800"
                alt="Carlos Maia"
                className="w-full h-full object-cover grayscale"
              />
            </div>
          </div>
          <div className="md:col-span-7">
            <div className="font-body text-xs uppercase tracking-widest text-stone-500 mb-3">Sobre</div>
            <h2 className="font-display text-4xl md:text-5xl text-stone-900 leading-tight mb-8">
              Mais de três décadas e meia <span className="italic font-light text-[#b85c3d]">conhecendo</span> Divinópolis casa por casa.
            </h2>

            <div className="space-y-5 font-body text-stone-600 text-lg leading-relaxed">
              <p>
                Sou Carlos Maia, corretor registrado no CRECI e atuo no mercado imobiliário de Divinópolis e região há mais de 35 anos. Comecei essa profissão por uma razão simples: comprar um imóvel é uma das decisões mais importantes da vida de qualquer pessoa, e merece ser conduzida com cuidado, transparência e conhecimento real do território.
              </p>
              <p>
                Cada imóvel que aparece neste site foi visitado, conversado com o proprietário e avaliado pessoalmente por mim. Você não vai encontrar aqui anúncio inflado, foto enganosa ou propriedade que eu não conheço de perto.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-6 mt-10 pt-10 border-t border-stone-200">
              <div>
                <div className="font-display text-xl text-stone-900 mb-1">Transparência</div>
                <div className="font-body text-sm text-stone-500">Informação honesta sobre cada imóvel — pontos fortes e limitações.</div>
              </div>
              <div>
                <div className="font-display text-xl text-stone-900 mb-1">Atendimento direto</div>
                <div className="font-body text-sm text-stone-500">Você fala comigo, não com um call center. Antes, durante e depois.</div>
              </div>
              <div>
                <div className="font-display text-xl text-stone-900 mb-1">Conhecimento local</div>
                <div className="font-body text-sm text-stone-500">Sei o que cada bairro oferece, valoriza e merece atenção.</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============ PROCESSO ============ */}
      <section id="processo" className="py-20 md:py-28 px-6 bg-stone-900 text-stone-50">
        <div className="max-w-7xl mx-auto">
          <div className="mb-16">
            <div className="font-body text-xs uppercase tracking-widest text-stone-400 mb-3">Como trabalhamos</div>
            <h2 className="font-display text-4xl md:text-5xl leading-tight max-w-3xl">
              Um processo <span className="italic font-light text-[#d97957]">claro</span>, do primeiro contato à entrega das chaves.
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-8 md:gap-12">
            {[
              { n: "01", titulo: "Entendimento", texto: "Conversamos sobre o que você procura: localização, faixa de investimento, número de quartos, e qualquer detalhe que importa para a sua família." },
              { n: "02", titulo: "Visitas curadas", texto: "Selecionamos apenas imóveis que fazem sentido para você. Sem perda de tempo com opções fora do perfil. Acompanho cada visita pessoalmente." },
              { n: "03", titulo: "Negociação e fechamento", texto: "Cuido de toda a documentação, financiamento e burocracia até a entrega das chaves. Você só se preocupa em escolher onde colocar os móveis." },
            ].map((etapa) => (
              <div key={etapa.n} className="border-t border-stone-700 pt-6">
                <div className="font-display text-5xl text-stone-500 mb-6">{etapa.n}</div>
                <div className="font-display text-2xl mb-3">{etapa.titulo}</div>
                <p className="font-body text-stone-400 leading-relaxed">{etapa.texto}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============ FAQ ============ */}
      <section id="faq" className="py-20 md:py-28 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <div className="font-body text-xs uppercase tracking-widest text-stone-500 mb-3">Dúvidas frequentes</div>
            <h2 className="font-display text-4xl md:text-5xl text-stone-900 leading-tight">
              Perguntas que <span className="italic font-light text-[#b85c3d]">todo mundo</span> faz.
            </h2>
          </div>

          <div className="space-y-3">
            {[
              { p: "Quais cidades vocês atendem?", r: "Atuamos principalmente em Divinópolis e cidades vizinhas como Carmo do Cajuru, Nova Serrana, Santo Antônio do Monte e Itaúna. Se você procura algo em outra cidade da região, entre em contato — provavelmente conseguimos te ajudar." },
              { p: "Como funciona a comissão de corretagem?", r: "A comissão segue a tabela do CRECI-MG e normalmente é paga pelo vendedor. Em qualquer negociação, todos os valores são apresentados de forma clara antes de qualquer assinatura." },
              { p: "Vocês ajudam com financiamento?", r: "Sim. Trabalhamos com diversos bancos e indicamos o caminho mais vantajoso para o seu perfil — Caixa, Bradesco, Itaú, Banco do Brasil e Santander. Também orientamos sobre uso do FGTS." },
              { p: "Posso visitar antes de me decidir?", r: "Claro, e recomendamos. Toda visita é agendada e acompanhada pelo Carlos pessoalmente. Sem pressão, sem pressa." },
              { p: "E se eu quiser vender meu imóvel?", r: "Fazemos avaliação gratuita e sem compromisso. Se decidirmos trabalhar juntos, cuidamos de fotos profissionais, divulgação e atendimento aos interessados — você só assina no final." },
            ].map((item, idx) => (
              <div key={idx} className="border border-stone-200 rounded-sm overflow-hidden bg-stone-50">
                <button
                  onClick={() => setFaqAberto(faqAberto === idx ? null : idx)}
                  className="w-full px-6 py-5 flex items-center justify-between text-left hover:bg-stone-100 transition"
                >
                  <span className="font-display text-lg text-stone-900 pr-4">{item.p}</span>
                  {faqAberto === idx ? <Minus size={20} className="flex-shrink-0 text-stone-500"/> : <Plus size={20} className="flex-shrink-0 text-stone-500"/>}
                </button>
                {faqAberto === idx && (
                  <div className="px-6 pb-5 font-body text-stone-600 leading-relaxed">{item.r}</div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============ CONTATO ============ */}
      <section id="contato" className="py-20 md:py-28 px-6 bg-[#faf0e9]/50">
        <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-12">
          <div>
            <div className="font-body text-xs uppercase tracking-widest text-stone-500 mb-3">Vamos conversar</div>
            <h2 className="font-display text-4xl md:text-5xl text-stone-900 leading-tight mb-6">
              Pronto para encontrar <span className="italic font-light text-[#b85c3d]">o seu imóvel?</span>
            </h2>
            <p className="font-body text-lg text-stone-600 leading-relaxed mb-10">
              Preencha o formulário ao lado e Carlos entra em contato no mesmo dia. Ou, se preferir, fale direto pelo WhatsApp.
            </p>

            <div className="space-y-4 font-body">
              <a href="tel:+5537988224964" className="flex items-center gap-4 text-stone-700 hover:text-stone-900 group">
                <div className="w-12 h-12 bg-stone-900 text-stone-50 rounded-full flex items-center justify-center group-hover:scale-105 transition">
                  <Phone size={18}/>
                </div>
                <div>
                  <div className="text-xs uppercase tracking-widest text-stone-500">Telefone</div>
                  <div className="text-lg">(37) 98822-4964</div>
                </div>
              </a>
              <a href="mailto:contato@carlosmaiaimoveis.com.br" className="flex items-center gap-4 text-stone-700 hover:text-stone-900 group">
                <div className="w-12 h-12 bg-stone-900 text-stone-50 rounded-full flex items-center justify-center group-hover:scale-105 transition">
                  <Mail size={18}/>
                </div>
                <div>
                  <div className="text-xs uppercase tracking-widest text-stone-500">Email</div>
                  <div className="text-lg">contato@carlosmaiaimoveis.com.br</div>
                </div>
              </a>
              <div className="flex items-center gap-4 text-stone-700">
                <div className="w-12 h-12 bg-stone-900 text-stone-50 rounded-full flex items-center justify-center">
                  <MapPin size={18}/>
                </div>
                <div>
                  <div className="text-xs uppercase tracking-widest text-stone-500">Atuação</div>
                  <div className="text-lg">Divinópolis e região — MG</div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-stone-50 border border-stone-200 rounded-sm p-8 md:p-10">
            {formEnviado ? (
              <div className="text-center py-12">
                <CheckCircle2 size={48} className="text-emerald-600 mx-auto mb-4"/>
                <div className="font-display text-2xl text-stone-900 mb-2">Mensagem enviada!</div>
                <p className="font-body text-stone-600">Carlos vai entrar em contato em breve. Obrigado!</p>
              </div>
            ) : (
              <div className="space-y-5">
                <div>
                  <label className="font-body text-xs uppercase tracking-widest text-stone-500 mb-2 block">Nome</label>
                  <input type="text" className="w-full px-4 py-3 border border-stone-300 rounded-sm font-body bg-stone-50 focus:outline-none focus:border-stone-900" placeholder="Seu nome completo"/>
                </div>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="font-body text-xs uppercase tracking-widest text-stone-500 mb-2 block">Telefone</label>
                    <input type="tel" className="w-full px-4 py-3 border border-stone-300 rounded-sm font-body bg-stone-50 focus:outline-none focus:border-stone-900" placeholder="(37) 98822-4964"/>
                  </div>
                  <div>
                    <label className="font-body text-xs uppercase tracking-widest text-stone-500 mb-2 block">Email</label>
                    <input type="email" className="w-full px-4 py-3 border border-stone-300 rounded-sm font-body bg-stone-50 focus:outline-none focus:border-stone-900" placeholder="seu@email.com"/>
                  </div>
                </div>
                <div>
                  <label className="font-body text-xs uppercase tracking-widest text-stone-500 mb-2 block">O que você procura?</label>
                  <textarea rows={4} className="w-full px-4 py-3 border border-stone-300 rounded-sm font-body bg-stone-50 focus:outline-none focus:border-stone-900 resize-none" placeholder="Conte um pouco sobre o imóvel ideal: bairro, número de quartos, faixa de preço..."/>
                </div>
                <button
                  onClick={() => setFormEnviado(true)}
                  className="w-full bg-stone-900 text-stone-50 py-4 rounded-full font-body font-medium hover:bg-stone-700 transition flex items-center justify-center gap-2"
                >
                  Enviar mensagem <ArrowRight size={18}/>
                </button>
                <p className="font-body text-xs text-stone-500 text-center">
                  Ao enviar, você concorda em ser contatado pela equipe Carlos Maia Imóveis.
                </p>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ============ FOOTER ============ */}
      <footer className="bg-stone-900 text-stone-300 py-16 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-4 gap-8 mb-12">
            <div className="md:col-span-2">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 border border-[#d97957] flex items-center justify-center font-display text-[#d97957] text-base leading-none">
                  <span>C</span><span className="italic -ml-0.5">M</span>
                </div>
                <div className="font-display leading-tight">
                  <div className="font-semibold text-stone-50 text-base">Carlos Maia</div>
                  <div className="text-[10px] text-stone-400 -mt-0.5 font-body tracking-[0.2em] uppercase">Imóveis</div>
                </div>
              </div>
              <p className="font-body text-sm text-stone-400 max-w-md leading-relaxed">
                Compra, venda e avaliação de imóveis em Divinópolis e região, com atendimento pessoal e mais de 20 anos de mercado.
              </p>
            </div>

            <div>
              <div className="font-body text-xs uppercase tracking-widest text-stone-500 mb-4">Navegação</div>
              <div className="space-y-2 font-body text-sm">
                <button onClick={() => scrollTo("imoveis")} className="block hover:text-stone-50">Imóveis</button>
                <button onClick={() => scrollTo("sobre")} className="block hover:text-stone-50">Sobre</button>
                <button onClick={() => scrollTo("processo")} className="block hover:text-stone-50">Processo</button>
                <button onClick={() => scrollTo("faq")} className="block hover:text-stone-50">Dúvidas</button>
                <button onClick={() => scrollTo("contato")} className="block hover:text-stone-50">Contato</button>
              </div>
            </div>

            <div>
              <div className="font-body text-xs uppercase tracking-widest text-stone-500 mb-4">Redes</div>
              <div className="flex gap-3">
                <a href="#" className="w-10 h-10 border border-stone-700 rounded-full flex items-center justify-center hover:bg-stone-50 hover:text-stone-900 transition">
                  <Instagram size={16}/>
                </a>
                <a href="#" className="w-10 h-10 border border-stone-700 rounded-full flex items-center justify-center hover:bg-stone-50 hover:text-stone-900 transition">
                  <Facebook size={16}/>
                </a>
                <a href="#" className="w-10 h-10 border border-stone-700 rounded-full flex items-center justify-center hover:bg-stone-50 hover:text-stone-900 transition">
                  <MessageCircle size={16}/>
                </a>
              </div>
            </div>
          </div>

          <div className="pt-8 border-t border-stone-700 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 font-body text-xs text-stone-500">
            <div>
              © {new Date().getFullYear()} Carlos Maia Imóveis · CRECI/MG XXXXX-F
            </div>
            <div>
              Divinópolis, Minas Gerais — Brasil
            </div>
          </div>
        </div>
      </footer>

      {/* ============ MODAL DE DETALHES ============ */}
      {imovelSelecionado && (
        <ModalImovel imovel={imovelSelecionado} onClose={() => setImovelSelecionado(null)} />
      )}

      {/* ============ WHATSAPP FLUTUANTE ============ */}
      <a
        href="https://wa.me/5537988224964"
        target="_blank"
        rel="noopener noreferrer"
        className="fixed bottom-6 right-6 z-30 w-14 h-14 bg-emerald-600 hover:bg-emerald-700 text-white rounded-full flex items-center justify-center shadow-xl hover:scale-105 transition"
        aria-label="Falar no WhatsApp"
      >
        <MessageCircle size={24}/>
      </a>
    </div>
  );
}

// ---------- CARD DE IMÓVEL ----------
function CardImovel({ imovel, onClick }) {
  const [imgErro, setImgErro] = useState(false);
  return (
    <button onClick={onClick} className="text-left group">
      <div className="aspect-[4/3] overflow-hidden rounded-sm mb-4 bg-stone-200 relative">
        {!imgErro ? (
          <img
            src={imovel.fotos[0]}
            alt={imovel.titulo}
            loading="lazy"
            onError={() => setImgErro(true)}
            className="w-full h-full object-cover group-hover:scale-105 transition duration-700"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-stone-200 via-stone-300 to-stone-400 flex items-center justify-center">
            <Home size={48} className="text-stone-50 opacity-60"/>
          </div>
        )}
        <div className="absolute top-3 left-3 bg-stone-50/95 backdrop-blur px-3 py-1 rounded-full font-body text-xs uppercase tracking-wider text-stone-700">
          {imovel.tipo}
        </div>
      </div>
      <div className="flex items-start justify-between gap-2 mb-2">
        <h3 className="font-display text-xl text-stone-900 leading-tight group-hover:text-stone-600 transition">
          {imovel.titulo}
        </h3>
      </div>
      <div className="font-body text-sm text-stone-500 flex items-center gap-1.5 mb-3">
        <MapPin size={13}/> {imovel.bairro}, {imovel.cidade}
      </div>
      <div className="flex items-center gap-4 font-body text-xs text-stone-600 mb-4">
        {imovel.quartos > 0 && <span className="flex items-center gap-1"><Bed size={13}/> {imovel.quartos}</span>}
        {imovel.banheiros > 0 && <span className="flex items-center gap-1"><Bath size={13}/> {imovel.banheiros}</span>}
        {imovel.vagas > 0 && <span className="flex items-center gap-1"><Car size={13}/> {imovel.vagas}</span>}
        <span className="flex items-center gap-1"><Maximize size={13}/> {imovel.area}m²</span>
      </div>
      <div className="font-display text-2xl font-medium text-stone-900">
        {formatarPreco(imovel.preco)}
      </div>
    </button>
  );
}

// ---------- MODAL ----------
function ModalImovel({ imovel, onClose }) {
  const [fotoAtual, setFotoAtual] = useState(0);
  const [imgErro, setImgErro] = useState(false);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  useEffect(() => { setImgErro(false); }, [fotoAtual]);

  const proximaFoto = () => setFotoAtual((p) => (p + 1) % imovel.fotos.length);
  const fotoAnterior = () => setFotoAtual((p) => (p - 1 + imovel.fotos.length) % imovel.fotos.length);

  return (
    <div className="fixed inset-0 z-50 bg-stone-900/80 backdrop-blur-sm overflow-y-auto" onClick={onClose}>
      <div className="min-h-screen px-4 py-8 flex items-start md:items-center justify-center">
        <div
          className="bg-stone-50 max-w-5xl w-full rounded-sm overflow-hidden relative my-auto"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={onClose}
            className="absolute top-4 right-4 z-10 w-10 h-10 bg-stone-50/90 hover:bg-stone-50 rounded-full flex items-center justify-center backdrop-blur"
            aria-label="Fechar"
          >
            <X size={18}/>
          </button>

          {/* Galeria */}
          <div className="relative aspect-[16/10] bg-stone-200">
            {!imgErro ? (
              <img
                src={imovel.fotos[fotoAtual]}
                alt={imovel.titulo}
                onError={() => setImgErro(true)}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-stone-200 via-stone-300 to-stone-400 flex items-center justify-center">
                <Home size={72} className="text-stone-50 opacity-60"/>
              </div>
            )}
            {imovel.fotos.length > 1 && (
              <>
                <button onClick={fotoAnterior} className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-stone-50/90 rounded-full flex items-center justify-center hover:bg-stone-50">
                  <ChevronLeft size={20}/>
                </button>
                <button onClick={proximaFoto} className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-stone-50/90 rounded-full flex items-center justify-center hover:bg-stone-50">
                  <ChevronRight size={20}/>
                </button>
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5">
                  {imovel.fotos.map((_, i) => (
                    <button key={i} onClick={() => setFotoAtual(i)} className={`w-2 h-2 rounded-full transition ${i === fotoAtual ? "bg-stone-50 w-6" : "bg-stone-50/50"}`}/>
                  ))}
                </div>
              </>
            )}
          </div>

          <div className="p-6 md:p-10">
            <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
              <div>
                <div className="font-body text-xs uppercase tracking-widest text-stone-500 mb-2">{imovel.tipo}</div>
                <h2 className="font-display text-3xl md:text-4xl text-stone-900 leading-tight">{imovel.titulo}</h2>
                <div className="font-body text-stone-500 mt-2 flex items-center gap-1.5"><MapPin size={14}/> {imovel.bairro}, {imovel.cidade}</div>
              </div>
              <div className="font-display text-3xl font-medium text-stone-900">{formatarPreco(imovel.preco)}</div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8 py-6 border-y border-stone-200">
              {imovel.quartos > 0 && <Stat icon={<Bed size={18}/>} label="Quartos" value={imovel.quartos}/>}
              {imovel.banheiros > 0 && <Stat icon={<Bath size={18}/>} label="Banheiros" value={imovel.banheiros}/>}
              {imovel.vagas > 0 && <Stat icon={<Car size={18}/>} label="Vagas" value={imovel.vagas}/>}
              <Stat icon={<Maximize size={18}/>} label="Área" value={`${imovel.area}m²`}/>
            </div>

            <div className="mb-8">
              <div className="font-display text-xl text-stone-900 mb-3">Sobre o imóvel</div>
              <p className="font-body text-stone-600 leading-relaxed">{imovel.descricao}</p>
            </div>

            {imovel.caracteristicas?.length > 0 && (
              <div className="mb-8">
                <div className="font-display text-xl text-stone-900 mb-4">Características</div>
                <div className="grid grid-cols-2 gap-2">
                  {imovel.caracteristicas.map((c) => (
                    <div key={c} className="flex items-center gap-2 font-body text-sm text-stone-600">
                      <CheckCircle2 size={14} className="text-emerald-600 flex-shrink-0"/> {c}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-3 pt-6 border-t border-stone-200">
              <a
                href={`https://wa.me/5537988224964?text=Olá Carlos! Tenho interesse no imóvel: ${imovel.titulo}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 bg-emerald-600 text-white py-4 rounded-full font-body font-medium text-center hover:bg-emerald-700 transition flex items-center justify-center gap-2"
              >
                <MessageCircle size={18}/> Conversar no WhatsApp
              </a>
              <a
                href="tel:+5537988224964"
                className="flex-1 bg-stone-900 text-stone-50 py-4 rounded-full font-body font-medium text-center hover:bg-stone-700 transition flex items-center justify-center gap-2"
              >
                <Phone size={18}/> Ligar agora
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Stat({ icon, label, value }) {
  return (
    <div className="flex items-center gap-3">
      <div className="text-stone-400">{icon}</div>
      <div>
        <div className="font-body text-xs uppercase tracking-widest text-stone-500">{label}</div>
        <div className="font-display text-lg text-stone-900">{value}</div>
      </div>
    </div>
  );
}
