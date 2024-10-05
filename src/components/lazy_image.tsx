import React from 'react'
import { singletonGetterByKey } from '@/common/ts_utils'
import log from '@/common/log'

export class IntersectionObserverManager {
  private observer: IntersectionObserver
  private targets: Array<{ done: boolean; el: HTMLElement, run: () => void }> = []

  constructor (params: IntersectionObserverInit) {
    log('Create observer', params)
    this.observer = new IntersectionObserver(this.handleObserve.bind(this), params)
  }

  observe (el: HTMLElement, run: () => void): void {
    this.targets.push({ el, run, done: false })
    this.observer.observe(el)
  }

  remove (el: HTMLElement): void {
    const index = this.targets.findIndex(target => target.el === el)

    if (index !== -1) {
      this.targets.splice(index, 1)
    }
  }

  private handleObserve (entries: IntersectionObserverEntry[]) {
    entries.forEach(entry => {
      if (entry.intersectionRatio <= 0) {
        return
      }

      const el = entry.target
      const index = this.targets.findIndex(target => target.el === el)

      if (index === -1 || this.targets[index].done) {
        return
      }

      this.targets[index].run()
      this.targets[index].done = true
    })
  }
}

export const getIntersectionObserverManager = singletonGetterByKey(
  (key: string) => key,
  (key: string, params: IntersectionObserverInit) => {
    return new IntersectionObserverManager(params)
  }
)

export type LazyImageProps = {
  type:       string;
  root:       HTMLElement;
  width?:     string | number;
  height?:    string | number;
  defaultUrl: string;
  getUrl:     () => Promise<string>;
}

type LazyImageState = {
  url: string;
  isLoading?: boolean;
}

export class LazyImage extends React.Component<LazyImageProps, LazyImageState> {
  private el: HTMLElement | null = null
  private manager: IntersectionObserverManager | null = null

  state = {
    url: '',
    isLoading: false
  }

  componentWillMount () {
    this.manager = getIntersectionObserverManager(
      this.props.type,
      {
        root: this.props.root,
        rootMargin: '20px',
        threshold: 0.01
      }
    )
  }

  componentWillUnmount () {
    if (this.el && this.manager) {
      this.manager.remove(this.el)
    }
  }

  startObserve (el: HTMLElement) {
    if (!this.manager) {
      return
    }

    this.manager.observe(el, () => {
      this.getUrl()
    })
  }


  getSizeString (size: string | number): string {
    if (typeof size === 'number') {
      return size + 'px'
    }
    return size as string
  }

  getImageStyle () {
    return {
      ...(!this.props.width ? {} : { width: this.getSizeString(this.props.width) }),
      ...(!this.props.height ? {} : { height: this.getSizeString(this.props.height) }),
      backgroundImage:    `url(${this.state.url})`,
      backgroundSize:     'contain',
      backgroundRepeat:   'no-repeat',
      backgroundPosition: 'center center'
    }
  }

  getUrl () {
    this.setState({ isLoading: true })

    return this.props.getUrl()
    .then((realUrl: string): void => {
      this.setState({
        url:       realUrl,
        isLoading: false
      })
    })
  }

  render () {
    return (
      <div
        className="lazy-image"
        style={this.getImageStyle()}
        ref={(el) => {
          this.el = el

          if (el) {
            this.startObserve(el)
          }
        }}
      />
    )
  }
}
