// import fs from 'fs'
// import path from 'path'
// import { glob } from 'glob'
import NativeMedia from './NativeMedia'
import YoutubeMedia from './YoutubeMedia'
import { MediaFactory } from '../MediaFactory.ts'


MediaFactory.register(NativeMedia)
MediaFactory.register(YoutubeMedia)

MediaFactory.registerAsync(async () => await import('./NativeMedia'))
MediaFactory.registerAsync(async () => await import('./YoutubeMedia'))

// const modules = glob('*.ts')
// console.log(modules)

// const absDir = path.resolve(__dirname),
// 	modules = (fs.readdirSync(absDir, { withFileTypes: true }))
// 		.filter(e => e.isFile() && path.extname(e.name).includes('ts'))
// 		.map(e => path.join(absDir, e.name))

// for (const path in modules) {
// 	MediaFactory.register(async () => await import(path))
// }
