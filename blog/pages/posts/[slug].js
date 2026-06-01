import Layout from '../../components/Layout'
import Link from 'next/link'
import { getAllPostSlugs, getPostData } from '../../lib/posts'

export async function getStaticPaths() {
  const paths = getAllPostSlugs()
  return { paths, fallback: false }
}

export async function getStaticProps({ params }) {
  const postData = await getPostData(params.slug)
  return { props: { postData } }
}

function formatDate(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  return d.toLocaleDateString('uz-UZ', { year: 'numeric', month: 'long', day: 'numeric' })
}

export default function Post({ postData }) {
  return (
    <Layout title={postData.title} description={postData.excerpt}>
      <article>
        <header className="mb-8">
          <Link href="/" className="text-sm text-gray-400 hover:text-gray-600 transition-colors mb-4 inline-block">
            ← Orqaga
          </Link>
          <h1 className="text-3xl font-bold leading-tight mb-3">{postData.title}</h1>
          <time className="text-sm text-gray-400">{formatDate(postData.date)}</time>
          {postData.tags && (
            <div className="mt-3 flex flex-wrap gap-2">
              {postData.tags.map(tag => (
                <span key={tag} className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">
                  #{tag}
                </span>
              ))}
            </div>
          )}
        </header>

        <div
          className="prose text-gray-800 leading-relaxed"
          dangerouslySetInnerHTML={{ __html: postData.contentHtml }}
        />
      </article>
    </Layout>
  )
}
