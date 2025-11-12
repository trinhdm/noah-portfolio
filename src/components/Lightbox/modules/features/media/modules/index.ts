// import fs from 'fs'
// import path from 'path'
// import { glob } from 'glob'
import { MediaFactory } from '../MediaFactory.ts'


MediaFactory.register(async () => await import('./YoutubeMedia'))
MediaFactory.register(async () => await import('./NativeMedia'))

// const modules = glob('*.ts')
// console.log(modules)

// const absDir = path.resolve(__dirname),
// 	modules = (fs.readdirSync(absDir, { withFileTypes: true }))
// 		.filter(e => e.isFile() && path.extname(e.name).includes('ts'))
// 		.map(e => path.join(absDir, e.name))

// for (const path in modules) {
// 	MediaFactory.register(async () => await import(path))
// }
