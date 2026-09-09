import path from "node:path"

function layer(filename, cwd) {
  const relative = path.relative(path.join(cwd, "src"), filename).split(path.sep)
  return { group: relative[0], feature: relative[1] }
}

export default {
  rules: {
    "dependency-direction": {
      meta: {
        type: "problem",
        schema: [],
        messages: { boundary: "Keep app → features → shared dependencies; move cross-feature queries to shared." },
      },
      create(context) {
        const filename = context.filename
        const origin = layer(filename, context.cwd)
        function check(node) {
          const source = node.source?.value
          if (typeof source !== "string") return
          const target = source.startsWith("@/")
            ? path.join(context.cwd, "src", source.slice(2))
            : source.startsWith(".") ? path.resolve(path.dirname(filename), source) : null
          if (!target) return
          const destination = layer(target, context.cwd)
          const shared = ["shared", "components", "hooks", "lib"]
          const invalid = (
            shared.includes(origin.group) && ["app", "features"].includes(destination.group)
          ) || (
            origin.group === "features" && (
              destination.group === "app"
              || (destination.group === "features" && destination.feature !== origin.feature)
            )
          )
          if (invalid) context.report({ node, messageId: "boundary" })
        }
        return {
          ImportDeclaration: check,
          ExportNamedDeclaration: check,
          ExportAllDeclaration: check,
          ImportExpression: check,
        }
      },
    },
  },
}
