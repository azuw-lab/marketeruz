import Head from 'next/head'
import Link from 'next/link'

const BLOG_NAME = "Azamat's Blog"
const BLOG_DESC = "Fikrlar, tajribalar va ko'proq narsa"

export default function Layout({ children, title, description }) {
  return (
    <>
      <Head>
        <title>{title ? `${title} — ${BLOG_NAME}` : BLOG_NAME}</title>
        <meta name="description" content={description || BLOG_DESC} />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <div className="min-h-screen flex flex-col">
        {/* Header */}
        <header className="border-b border-gray-200">
          <div className="max-w-2xl mx-auto px-4 py-5 flex items-center justify-between">
            <Link href="/" className="text-xl font-bold tracking-tight hover:opacity-70 transition-opacity">
              {BLOG_NAME}
            </Link>
            <nav className="text-sm text-gray-500 flex gap-5">
              <Link href="/" className="hover:text-gray-900 transition-colors">Bosh sahifa</Link>
              <Link href="/about" className="hover:text-gray-900 transition-colors">Men haqimda</Link>
            </nav>
          </div>
        </header>

        {/* Main */}
        <main className="flex-1 max-w-2xl mx-auto px-4 py-10 w-full">
          {children}
        </main>

        {/* Footer */}
        <footer className="border-t border-gray-100 text-center text-sm text-gray-400 py-6">
          © {new Date().getFullYear()} {BLOG_NAME}
        </footer>
      </div>
    </>
  )
}
