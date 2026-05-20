import Hero       from "./sections/00-Hero";
import Abstract   from "./sections/01-Abstract";
import Playground from "./sections/02-Playground";
import Comparisons from "./sections/03-Comparisons";
import Methods    from "./sections/03-Methods";
import Preprocessing from "./sections/04-Preprocessing";
import Resources  from "./sections/04-Resources";
import FontSizeControl from "./components/FontSizeControl";

const HR = () => (
  <hr className="border-rule/20 max-w-wide mx-auto px-6"/>
);

export default function App() {
  return (
    <main>
      <FontSizeControl/>
      <Hero/>
      <HR/>
      <Abstract/>
      <HR/>
      <Playground/>
      <HR/>
      <Comparisons/>
      <HR/>
      <Methods/>
      <HR/>
      <Preprocessing/>
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
