import { BeatSequencer } from "@/components/beat-sequencer"

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 md:p-24">
      <h1 className="text-3xl font-bold mb-8 text-center">Circular Beat Sequencer</h1>
      <BeatSequencer />
    </main>
  )
}
