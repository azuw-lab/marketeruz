import Layout from '../components/Layout'

export default function About() {
  return (
    <Layout title="Men haqimda">
      <article>
        <h1 className="text-3xl font-bold mb-6">Men haqimda</h1>
        <div className="prose text-gray-700 leading-relaxed space-y-4">
          <p>
            Salom! Men Azamat. Marketing va texnologiya sohasida ishlayman.
          </p>
          <p>
            Bu blogda o'zimni qiziqtirgan mavzular — marketing, raqamli dunyo,
            hayot tajribalari haqida yozaman.
          </p>
          <p>
            Bog'lanish uchun: <a href="mailto:azamatmatnazarov7@gmail.com" className="text-blue-600 underline">azamatmatnazarov7@gmail.com</a>
          </p>
        </div>
      </article>
    </Layout>
  )
}
