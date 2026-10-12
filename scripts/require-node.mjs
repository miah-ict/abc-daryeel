const [major = 0, minor = 0] = process.versions.node.split('.').map(Number)

if (major < 22 || (major === 22 && minor < 12)) {
  console.error(`ABC requires Node.js 22.12 or newer; found ${process.version}. Run \`nvm use\` and then retry.`)
  process.exit(1)
}
