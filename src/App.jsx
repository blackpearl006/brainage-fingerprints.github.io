import Hero       from "./sections/00-Hero";
import Abstract   from "./sections/01-Abstract";
import Playground from "./sections/02-Playground";
import Methods    from "./sections/03-Methods";
import Resources  from "./sections/04-Resources";

const HR = () => (
  <hr className="border-rule/20 max-w-wide mx-auto px-6"/>
);

export default function App() {
  return (
    <main>
      <Hero/>
      <HR/>
      <Abstract/>
      <HR/>
      <Playground/>
      <HR/>
      <Methods/>
      <HR/>
      <Resources/>
      <footer className="py-12 text-center font-mono text-xs text-ink2 border-t border-rule/20 mt-8">
        <p>© 2026 Ninad Aithal et al. · Indian Institute of Science, Bangalore</p>
        <p className="mt-1 text-ink2/50">
          Data visualisation — <a href="https://github.com/blackpearl006/brainage-fingerprints.github.io" className="hover:text-ink underline">GitHub</a>
        </p>
      </footer>
    </main>
  );
}
