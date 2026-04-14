import TemplateEditor from '@/components/TemplateEditor'

export default function TemplatePage() {
  return (
    <div className="p-8 space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold">Template AI</h1>
        <p className="text-sm text-slate-400 mt-1">
          Gemini personalizza il template per ogni lead
        </p>
      </div>
      <TemplateEditor />
    </div>
  )
}
