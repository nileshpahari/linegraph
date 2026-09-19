import { createMiddleware } from "langchain";

/**
 * Deep Agents ships a planner and a managed filesystem. This phase has
 * neither: every fact comes from the six LineGraph tools. Filtering the model's
 * tool list keeps the filesystem tools out of the conversation entirely.
 */
const LINEGRAPH_TOOLS = new Set([
  "analysis_summary",
  "search_files",
  "list_files_by_role",
  "file_neighbours",
  "walk",
  "routes",
]);

export const linegraphOnly = createMiddleware({
  name: "LineGraphOnlyTools",
  wrapModelCall: (request, handler) =>
    handler({
      ...request,
      tools: request.tools.filter(
        (tool) =>
          typeof tool.name === "string" && LINEGRAPH_TOOLS.has(tool.name),
      ),
    }),
});
