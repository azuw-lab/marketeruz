import Layout from '../components/Layout'
import Link from 'next/link'
import { getSortedPostsData } from '../lib/posts'

export async function getStaticProps() {
  const allPostsData = getSortedPostsData()
  return { props: { allPostsData } }
}

function formatDate(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  return d.toLocaleDateString('uz-UZ', { year: 'numeric', month: 'long', day: 'numeric' })
}

export default function Home({ allPostsData }) {
  return (
    <Layout>
      <section className="mb-10">
        <h1 className="text-3xl font-bold mb-2">Salom 👋</h1>
        <p className="text-gray-500 text-lg">Marketing, texnologiya va hayot haqida yozaman.</p>
      </section>

      <section>
        <h2 className="text-sm font-semibold uppercase tracking-widest text-gray-400 mb-6">Maqolalar</h2>
        {allPostsData.length === 0 && (
          <p className="text-gray-400">Hali maqola yo'q. Birinchi postingizni yozing!</p>
        )}
        <ul className="space-y-8">
          {allPostsData.map(({ slug, date, title, excerpt }) => (
            <li key={slug}>
              <Link href={`/posts/${slug}`} className="group block">
                <h3 className="text-xl font-semibold group-hover:text-blue-600 transition-colors mb-1">
                  {title}
                </h3>
                {excerpt && (
                  <p className="text-gray-500 text-sm mb-1 line-clamp-2">{excerpt}</p>
                )}
                <time className="text-xs text-gray-400">{formatDate(date)}</time>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </Layout>
  )
}
