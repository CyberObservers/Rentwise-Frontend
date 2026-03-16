declare module 'd3-cloud' {
  export type BaseCloudWord = {
    text: string
    size: number
    x?: number
    y?: number
    rotate?: number
  }

  export interface CloudLayout<T extends BaseCloudWord> {
    size(size: [number, number]): CloudLayout<T>
    words(words: T[]): CloudLayout<T>
    padding(padding: number): CloudLayout<T>
    rotate(rotate: (word: T, index: number) => number): CloudLayout<T>
    font(font: string): CloudLayout<T>
    fontSize(fontSize: (word: T) => number): CloudLayout<T>
    on(event: 'end', callback: (words: T[]) => void): CloudLayout<T>
    start(): void
    stop(): void
  }

  export default function cloud<T extends BaseCloudWord>(): CloudLayout<T>
}
