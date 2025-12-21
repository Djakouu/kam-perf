export function Documentation() {
    return (
        <div className="flex-1 overflow-y-auto bg-neutral-100 p-8">
            <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-sm border border-neutral-200 p-8">
                <h1 className="text-3xl font-bold text-neutral-900 mb-6">Documentation</h1>

                <div className="prose prose-neutral max-w-none">
                    <section className="mb-8">
                        <h2 className="text-xl font-semibold text-neutral-800 mb-3">Overview</h2>
                        <p className="text-neutral-600 mb-4">
                            This tool uses Lighthouse v12 to measure the CPU time of the Kameleoon script.
                        </p>
                        <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-4">
                            <p className="text-blue-700">
                                <strong>CPU Time:</strong> The total time the main thread spent executing the script during the page load (Bootup Time), including: Parsing, Compiling, and Executing scripts.
                                <br />
                                <br />
                                <strong>Kameleoon CPU Time:</strong> The amount of main-thread CPU time consumed by the Kameleoon JS during page load, from script initialization until all execution triggered by Kameleoon has completed.
                            </p>
                        </div>
                    </section>

                    <section className="mb-8">
                        <h2 className="text-xl font-semibold text-neutral-800 mb-3">Structure & Setup</h2>
                        <p className="text-neutral-600 mb-4">
                            The dashboard is organized hierarchically to help you manage and analyze performance across different contexts:
                        </p>
                        <ul className="list-disc list-inside space-y-2 text-neutral-600 ml-4">
                            <li><strong>Accounts:</strong> Create an account for each customer.</li>
                            <li><strong>Domains:</strong> Inside an account, add domains (projects) corresponding to each site code.</li>
                            <li><strong>Pages:</strong> For each domain, add specific pages to analyze. We recommend adding at least <strong>5 pages</strong> per domain as impact can vary significantly between pages.</li>
                        </ul>
                    </section>

                    <section className="mb-8">
                        <h2 className="text-xl font-semibold text-neutral-800 mb-3">Analysis Process</h2>
                        <div className="space-y-4 text-neutral-600">
                            <p>
                                When you start an analysis for a page:
                            </p>
                            <ol className="list-decimal list-inside space-y-2 ml-4">
                                <li>The system runs Lighthouse <strong>5 times</strong>.</li>
                                <li>The average CPU time is calculated and set as the result for that day.</li>
                                <li>If multiple analyses are run on the same day, only the most recent one is kept.</li>
                            </ol>

                            <h3 className="text-lg font-medium text-neutral-800 mt-4 mb-2">Script Detection & Injection</h3>
                            <p>
                                For each domain, you can configure the Kameleoon script URL (e.g., <code>https://sitecode.kameleoon.io/engine.js</code>).
                            </p>
                            <p>
                                The analysis follows this logic:
                            </p>
                            <ul className="list-disc list-inside space-y-2 ml-4">
                                <li>First, it runs once for Desktop and once for Mobile to detect the script naturally.</li>
                                <li>If the script is <strong>not detected</strong> (CPU time = 0ms), the system will automatically <strong>inject</strong> the configured script.</li>
                                <li>It then runs the full 5-run analysis for each device with the injected script.</li>
                            </ul>
                        </div>
                    </section>

                    <section className="mb-8">
                        <h2 className="text-xl font-semibold text-neutral-800 mb-3">Metrics Calculation</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                            <div className="bg-neutral-50 p-4 rounded-md border border-neutral-200">
                                <h3 className="font-medium text-neutral-900 mb-2">Domain CPU Time</h3>
                                <p className="text-sm text-neutral-600">
                                    The average of the CPU times of all pages in that domain that have a time &gt; 0ms for that day.
                                </p>
                            </div>
                            <div className="bg-neutral-50 p-4 rounded-md border border-neutral-200">
                                <h3 className="font-medium text-neutral-900 mb-2">Account CPU Time</h3>
                                <p className="text-sm text-neutral-600">
                                    The average of the CPU times of all domains in that account that have a time &gt; 0ms for that day.
                                </p>
                            </div>
                        </div>
                    </section>

                    <section className="mb-8">
                        <h2 className="text-xl font-semibold text-neutral-800 mb-3">Context & Comments</h2>
                        <p className="text-neutral-600 mb-4">
                            You can add comments at any level (Account, Domain, or Page) to provide context for the data. This is useful for explaining changes in performance, such as:
                        </p>
                        <ul className="list-disc list-inside space-y-1 text-neutral-600 ml-4">
                            <li>Cleanup of segments or goals.</li>
                            <li>Code optimizations.</li>
                            <li>New tests going live.</li>
                        </ul>
                    </section>

                    <section className="mb-8">
                        <h2 className="text-xl font-semibold text-neutral-800 mb-3">Important Notes</h2>
                        <ul className="list-disc list-inside space-y-2 text-neutral-600 ml-4">
                            <li>
                                <strong>Fresh Browser:</strong> Each analysis runs in a fresh browser instance without cache. Results may vary slightly between runs due to network conditions or device emulation variability. The goal is to identify trends and improve the average.
                            </li>
                            <li>
                                <strong>Mobile vs Desktop:</strong> Mobile CPU time is typically higher because Lighthouse emulates a mid-range mobile device (Moto G4) with CPU throttling, whereas Desktop runs with less throttling.
                            </li>
                            <li>
                                <strong>Filters:</strong> Use the filters bar to narrow down the view. When filtering by date, the graphs and averages will only reflect data within the selected range.
                            </li>
                        </ul>
                    </section>
                </div>
            </div>
        </div>
    );
}
