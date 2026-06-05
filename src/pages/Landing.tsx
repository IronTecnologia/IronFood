import { Link } from 'react-router-dom'
import { CinematicHero } from '../components/ui/cinematic-landing-hero'

export default function Landing() {
  return (
    <div className="overflow-x-hidden w-full min-h-screen">
      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-[100] bg-background/80 backdrop-blur-md border-b border-slate-800 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center flex-shrink-0">
              <span className="text-white font-bold text-sm">MF</span>
            </div>
            <span className="font-bold text-white text-lg">MesaFlow</span>
          </div>

          <div className="flex items-center gap-4">
            <Link
              to="/login"
              className="px-6 py-2 text-sm font-medium text-slate-300 hover:text-white transition-colors"
            >
              Entrar
            </Link>
            <Link
              to="/login"
              className="px-6 py-2 text-sm font-medium bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors shadow-lg"
            >
              Começar Agora
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <CinematicHero
        brandName="MesaFlow"
        tagline1="MesaFlow"
        tagline2="da sua empresa no ramo de food service"
        cardHeading="Gestão de restaurante, simplificada."
        cardDescription={
          <>
            <span className="text-white font-semibold">MesaFlow</span> permite que gerentes de restaurantes rastreiem pedidos em tempo real, gerenciem cozinhas com displays dedicados, administrem entregas e visualizem analytics de mesas. Sirva mais rápido, gerencie melhor.
          </>
        }
        metricValue={1250}
        metricLabel="Pedidos Gerenciados"
        ctaHeading="Escale seu restaurante."
        ctaDescription="Junte-se a milhares de restaurantes usando MesaFlow para otimizar operações, reduzir tempo de espera e encantar clientes."
      />
    </div>
  )
}
