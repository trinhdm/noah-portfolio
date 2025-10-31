import * as esbuild from 'esbuild'


const ctx = await esbuild.context({
	entryPoints: ['src/app.ts'],
	outdir: 'dist',
})

const { host, port } = await ctx.serve({
	servedir: 'dist',
	port: 8000,
	fallback: 'dist/index.html',
})


console.log(`Server running on http://${host}:${port}`)
