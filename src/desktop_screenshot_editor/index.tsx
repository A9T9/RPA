import React, { CSSProperties } from 'react'
import ReactDOM from 'react-dom'
import { ConfigProvider, Button, Checkbox, Modal, message } from 'antd'
import en_US from 'antd/lib/locale/en_US'
import { selectArea } from '../ext/content_script/select_area'
import { DesktopScreenshot } from './types'
import { getNativeCVAPI } from '../services/desktop';
import { csInit } from '../common/ipc/ipc_bg_cs'
import storage from '../common/storage'
import { accurateOffset, subImage, preloadImage } from '../common/dom_utils'
import { getStorageManager, StorageStrategyType } from '../services/storage'
import { getXFile } from '../services/xmodules/xfile'
import { delay } from '../common/ts_utils'
import { cn } from '../common/utils'
import { OcrTextSearchMatchForHighlight, OcrHighlightType, OcrPositionedWord } from '../services/ocr/types'
import { ocrMatchRect } from '../services/ocr'
import { polyfillTimeoutFunctions } from '../services/timeout/cs_timeout'
import { getState,updateState } from '../ext/common/global_state'

// import 'antd/dist/antd.css'
import './index.scss'
import { any } from 'prop-types'

const csIpc = csInit(true)
let allState:any ={};
init()
polyfillTimeoutFunctions(csIpc)

function init () {
  return Promise.all([
    restoreConfig(),
    getXFile().getConfig()
  ])
  .then(async ([config, xFileConfig]) => {
    allState = await getState();
    getStorageManager(config.storageMode)
    render()
  }, render)
}

function restoreConfig () {
  return storage.get('config')
  .then((config = {}) => {
    return {
      storageMode: StorageStrategyType.Browser,
      ...config
    }
  })
}

function render () {
  const rootEl = document.getElementById('root')

  return ReactDOM.render(
    <ConfigProvider locale={en_US}>
      <App />
    </ConfigProvider>,
    rootEl
  )
}

type Props = {}

type State = {
  mode:           DesktopScreenshot.RequestType;
  rects:          DesktopScreenshot.StyledRect[];
  ocrMatches:     OcrTextSearchMatchForHighlight[];
  imageUrl:       string;
  scale:          number;
  imagePageRect:  { x: number, y: number, width: number, height: number };
  imageSize:      { width: number, height: number };
}

class App extends React.Component<Props, State> {
  state: State = {
    mode:           DesktopScreenshot.RequestType.DisplayVisualResult,
    rects:          [],
    ocrMatches:     [],
    imageUrl:       '',
    scale:          0.5,
    imagePageRect:  { x: 0, y: 0, width: 0, height: 0 },
    imageSize:      { width: 0, height: 0 }
  }

  componentDidMount () {
    console.log('state:>> ', this.state)
    csIpc.onAsk((type: string, data: any) => {
      console.log('onAsk type:>>', type)
      console.log('onAsk data:>>', data)
      switch (type) {
        case 'DOM_READY':
          return true

        case DesktopScreenshot.RequestType.DisplayVisualX: {
          const d = data as DesktopScreenshot.DisplayVisualRequestData

          this.setState({
            mode:   DesktopScreenshot.RequestType.DisplayVisualX,
            rects:  d.rects
          })

          return this.consumeImageInfo(d.image)
          .then(() => true)
        }

        case DesktopScreenshot.RequestType.DisplayVisualResult: {
          const d = data as DesktopScreenshot.DisplayVisualRequestData

          this.setState({
            mode:   DesktopScreenshot.RequestType.DisplayVisualResult,
            rects:  d.rects
          })

          return this.consumeImageInfo(d.image)
          .then(() => true)
        }

        case DesktopScreenshot.RequestType.DisplayOcrResult: {
          const d = data as DesktopScreenshot.DisplayOcrRequestData

          this.setState({
            mode:       DesktopScreenshot.RequestType.DisplayOcrResult,
            ocrMatches: d.ocrMatches
          })

          return this.consumeImageInfo(d.image)
          .then(() => true)
        }

        case DesktopScreenshot.RequestType.Capture: {
          const d = data as DesktopScreenshot.CaptureRequestData

          this.setState({
            mode: DesktopScreenshot.RequestType.Capture
          })

          return this.consumeImageInfo(d.image)
          .then(() => delay(() => {}, 1000))
          .then(() => this.selectAreaOnImage())
        }
      }
    })
  }

  resetToMode (mode: DesktopScreenshot.RequestType): Promise<void> {
    return new Promise(resolve => {
      this.setState({
        mode,
        rects: [],
        ocrMatches: []
      }, () => resolve())
    })
  }

  updateImagePageRect () {
    const $image: HTMLImageElement | null = (this as any).$image
    if (!$image)  return

    const offset = accurateOffset($image)

    this.setState({
      imagePageRect: {
        x:      offset.left,
        y:      offset.top,
        width:  $image.offsetWidth,
        height: $image.offsetHeight
      }
    })
  }

  getImagePageRect () {
    return this.state.imagePageRect
  }

  selectAreaOnImage () {
    return new Promise((resolve, reject) => {
      selectArea({
        preventGlobalClick: false,
        clickToDestroy: false,
        overlayStyles: {
          top: this.state.imagePageRect.y + 'px'
        },
        onDestroy: () => {
          resolve(null)
        },
        done: (rect, boundingRect) => {
          const areaPageRect  = rect
          const imagePageRect = this.getImagePageRect()
          const relativeRect  = {
            x:      areaPageRect.x - imagePageRect.x,
            y:      areaPageRect.y - imagePageRect.y,
            width:  areaPageRect.width,
            height: areaPageRect.height,
          }
          const finalScale = (1 / this.state.scale) * (this.state.imageSize.width / screen.width)
          const finalRect = {
            x:      relativeRect.x * finalScale,
            y:      relativeRect.y * finalScale,
            width:  relativeRect.width * finalScale,
            height: relativeRect.height * finalScale,
          }

          return subImage(this.state.imageUrl, finalRect)
          .then(resolve, reject)
        },
        allowCursor: (e: DragEvent): boolean => {
          const imagePageRect = this.getImagePageRect()
          const x = e.pageX
          const y = e.pageY

          return  x > imagePageRect.x &&
                  y > imagePageRect.y &&
                  x < imagePageRect.x + imagePageRect.width &&
                  y < imagePageRect.y + imagePageRect.height
        }
      })
    })
    .then(result => {
      this.setState({ mode: DesktopScreenshot.RequestType.DisplayVisualResult })
      return result
    })
    .catch(e => {
      this.setState({ mode: DesktopScreenshot.RequestType.DisplayVisualResult })
      throw e
    })
  }

  consumeImageInfo (image: DesktopScreenshot.ImageInfo): Promise<void> {
    const pImageDataUrl = (() => {
      switch (image.source) {
        case DesktopScreenshot.ImageSource.HardDrive:
        case DesktopScreenshot.ImageSource.Storage:
          return getStorageManager().getScreenshotStorage().read(image.path, 'DataURL') as Promise<string>

        case DesktopScreenshot.ImageSource.CV:
          return getNativeCVAPI().readFileAsDataURL(image.path, true);

        case DesktopScreenshot.ImageSource.DataUrl:
          return Promise.resolve(image.path)
      }
    })()

    return pImageDataUrl.then((dataUrl: string) => {
      this.setState({
        imageUrl: dataUrl
      })

      preloadImage(dataUrl)
      .then(result => {
        this.setState({
          imageSize: {
            width:  result.width,
            height: result.height
          }
        })
      })


      setTimeout(() => {
        this.updateImagePageRect()
      }, 1000)
    })
  }

  cornerPosition (rect: DesktopScreenshot.Rect): string {
    const required = {
      width:  50,
      height: 20
    }
    const horizon   = rect.x < required.width ? 'right' : 'left'
    const vertical  = rect.y < required.height ? 'bottom' : 'top'

    return vertical + '-' + horizon
  }

  ocrMatchStyle (pw: OcrPositionedWord, match: OcrTextSearchMatchForHighlight) {
    const { scale } = this.state
    const styleByType = (() => {
      switch (match.highlight) {
        case OcrHighlightType.Identified:
          return {
            color: 'rgba(255, 0, 0, 1)',
            backgroundColor: 'rgba(200, 200, 200, 0.75)'
          }

        case OcrHighlightType.Matched:
          return {
            color: '#f00',
            backgroundColor: 'rgba(255, 215, 15, 0.5)'
          }

        case OcrHighlightType.TopMatched:
          return {
            color: '#fe1492',
            backgroundColor: 'rgba(255, 215, 15, 0.5)'
          }
      }
    })()

    return {
      boxSizing:        'border-box',
      position:         'absolute',
      left:             `${scale * pw.word.Left}px`,
      top:              `${scale * pw.word.Top}px`,
      width:            `${scale * pw.word.Width}px`,
      height:           `${scale * pw.word.Height}px`,
      lineHeight:       `${scale * pw.word.Height}px`,
      fontSize:         `${scale * pw.word.Height * 0.8}px`,
      fontWeight:       'bold',
      textAlign:        'center',
      pointerEvents:    'none',
      ...styleByType
    } as CSSProperties
  }

  renderRectForOcrMatch (match: OcrTextSearchMatchForHighlight,allState:any, serial: number) {
    const { scale } = this.state
    const rect  = ocrMatchRect(match)
    const styles: CSSProperties = {
      boxSizing:        'border-box',
      position:         'absolute',
      left:             `${scale * rect.x}px`,
      top:              `${scale * rect.y}px`,
      width:            `${scale * rect.width}px`,
      height:           `${scale * rect.height}px`,
      border:           `2px solid #fe1492`,
      background:       `transparent`,
      pointerEvents:    'none',
    }

    const serialElementStyles: CSSProperties = {
      position: 'absolute',
      left:             `${scale * (rect.x - 15)}px`,
      top:              `${scale * (rect.y - 15)}px`,
      fontSize: '10px',
      lineHeight: '10px',
      color: '#e31399',
      border: '2px solid',
      padding: '2px 4px',
      borderRadius: '4px'
    }

    const circleElementStyles: CSSProperties = {
      left:             `${scale * (rect.x + (rect.width / 2) - 5)}px`,
      top:              `${scale * (rect.y + (rect.height / 2) - 5)}px`,
      position: 'absolute',
      border: '3px solid #e31399ba',
      padding: '3px 3px',
      borderRadius: '10px',
    }

    const textElementStyles: CSSProperties = {
      position: 'absolute',
      left:             `${scale * rect.x}px`,
      top:              `${scale * (rect.y + rect.height - 5)}px`,
      fontSize: '18px',
      fontWeight: 'bold',
      color: '#4697fc'
    }

      
    if((allState['curent_cmd'] == "XClickTextRelative") || (!!localStorage.getItem('curent_cmd') && localStorage.getItem('curent_cmd') =="XClickTextRelative" )){
      
      let markerDiv="";
      var stylesY: CSSProperties = {}
      var stylesX: CSSProperties = {}
      var stylesBox: CSSProperties = {}
      let xD:any=0,yD:any=0;
      let isLeft:any=false;
      let isTopY:any=false;
      let isXavilable:any=false;
      if((allState['curent_cmd'] == "XClickTextRelative" || allState['curent-cmd'] == "XClickTextRelative") || 
      (!!localStorage.getItem('curent_cmd') && localStorage.getItem('curent_cmd') =="XClickTextRelative" )){
        function getTickCounter (str: any) {
            function getNumberSet(num: any,type: any){
                if(parseInt(num) > 0 && type == 'X') {
                  return ['>',parseInt(num)];
                } else if(parseInt(num) < 0 && type == 'X') {
                  return ['<', parseInt(num.replace('-', ''))];
                } else if(parseInt(num) > 0 && type == 'Y') {
                  return ['^',parseInt(num)];
                }else{
                  return ['v',parseInt(num.replace('-', ''))];
                }
              }
  
              function getAllNumbersWithSign(str:any) {
                const matches = str.match(/-?\d+/g);
                if (matches) {
                  return matches;
                }
                return null;
              }
  
              if(str.indexOf('#R')!==-1){//ABC #R-6,3
                  const parts = str.split("#R");
                  const nums = getAllNumbersWithSign(parts[1]);
                  const [x1, y1] = getNumberSet(nums[0],'X');
                  let [x2, y2] = getNumberSet(nums[1],'Y');; // 3
                  let valueObj:any={};
                  valueObj[x1]=y1;
                  valueObj[x2]=y2;
                  return valueObj;
              }
              
              // return str.split('').reduce((total, letter) => {
              //   total[letter] ? total[letter]++ : total[letter] = 1;
              //   return total;
              // }, {});
          };
        const cal_tragte:any = !!localStorage.getItem('caliber_trget') ? localStorage.getItem('caliber_trget'):'';
        //const caliberTick = cal_tragte.split('#R')[1];
        const caliberTick = cal_tragte;
        const countCalObj = getTickCounter(caliberTick);
        //const ocrCalibration:any = !!localStorage.getItem('ocrCalibration') ? localStorage.getItem('ocrCalibration'):6;
        const ocrCalibration:any = 7;
      
        for (var x in countCalObj) {
          if (x=='v' || x=='v') {
            yD += rect['y'] + ocrCalibration * countCalObj[x]; //down (add in y offset)
          }
          if (x=='>') {
            xD += rect['x'] + ocrCalibration * countCalObj[x]; //right (add in x offset)
          }
          if (x=='<') {
            xD += rect['x'] - ocrCalibration * countCalObj[x]; //left (minus in x offset)
            isLeft=true;
          }
          if (x=='^') {
            yD += rect['y'] - ocrCalibration * countCalObj[x]; //up (minus in y offset)
            isTopY=true;
          }
      }
      if(yD!=0){
        var stylesY: CSSProperties = {
          position:         'absolute',
          left:             `${scale * (rect.x+rect.width/2)}px`,
          top:              `${scale * rect.y}px`,
          height:           `${(scale * Math.abs(rect.y-yD))}px`,
          borderLeft:           `2px solid red`
        }
        if(isTopY){
          let yHeight:any = stylesY['height'];
          let yTop:any = stylesY['top'];
          
          stylesY['top']=(Math.abs((parseFloat(yTop) - parseInt(yHeight))))
        }
    
      } else {
        yD=rect.y
      }
      
      if(xD!=0){
        var stylesX: CSSProperties = {
          position:         'absolute',
          left:             `${scale * (rect.x+rect.width/2)}px`,
          top:              `${scale * yD}px`,
          width:           `${(scale * Math.abs(rect.x-xD))}px`,
          borderBottom:           `2px solid red`
        }
        if(isLeft){
          stylesX['left']=(scale * Math.abs((rect.x+ (rect.width/2))- Math.abs(rect.x-xD)))
        }
        isXavilable=true;
      }
      
      if(isXavilable){
        let xWidth:any = stylesX['width'];
        let xLeft:any = stylesX['left'];
        let leftNewX = isLeft? (parseFloat(xLeft) - ((scale * 20))) :(parseFloat(xLeft) + (parseFloat(xWidth)));
        var stylesBox: CSSProperties = {
          position:         'absolute',
          left:             `${leftNewX}px`,
          top:              `${(scale * yD)-((scale * 20/2))}px`,
          width:            `${(scale * 20)}px`,
          height:           `${(scale * 20)}px`,
          border:           `2px solid green`
        }
      }else{
        let yLeft:any = stylesY['left'];
        let yHeight:any = stylesY['height'];
        let leftNewY:any = parseFloat(yLeft);
        let yTop:any = stylesY['top'];
        let toptNewY = isTopY? (parseFloat(yTop) - ((scale * 20))) :(parseFloat(yTop) + (parseFloat(yHeight)));
        
        var stylesBox: CSSProperties = {
          position:         'absolute',
          left:             `${leftNewY-((scale * 20/2))}px`,
          top:              `${toptNewY}px`,
          width:            `${(scale * 20)}px`,
          height:           `${(scale * 20)}px`,
          border:           `2px solid green`
        }
      }
      }  
      
      return (
        <div>
        <div style={styles}></div>
        <div style={stylesY}></div>
        <div style={stylesX}></div>
        <div style={stylesBox}></div>
        </div>
      )
       
    } else if(allState['curent_cmd'] == "OCRExtractbyTextRelative" || (!!localStorage.getItem('curent_cmd') && localStorage.getItem('curent_cmd') =="OCRExtractbyTextRelative") ||
    allState['curent_cmd'] == "visionLimitSearchAreabyTextRelative"  || (!!localStorage.getItem('curent_cmd') && localStorage.getItem('curent_cmd') =="visionLimitSearchAreabyTextRelative")){
      const $rectBox = document.createElement('div')
      $rectBox.setAttribute('id', 'rect-ocr-box');
      
      const styles: CSSProperties = {
        boxSizing:        'border-box',
        position:         'absolute',
        left:             `${scale * rect.x}px`,
        top:              `${scale * rect.y}px`,
        width:            `${scale * rect.width}px`,
        height:           `${scale * rect.height}px`,
        border:           `2px solid #fe1492`,
        background:       `transparent`,
        pointerEvents:    'none',
      }
      let markerDiv="";
      var stylesY: CSSProperties = {}
      var stylesX: CSSProperties = {}
      var stylesBox: CSSProperties = {}
      let xD:any=0,yD:any=0;
      let isLeft:any=false;
      let isTopY:any=false;
      let isXavilable:any=false;
      

    function getCoordinates(str:any){
        //var regex = /TL(-?\d+),(-?\d+)BR(-?\d+),(-?\d+)/;
        var regex = /R(-?\d+),(-?\d+)W(-?\d+)H(-?\d+)/;
        var matches:any = str.match(regex);

        var x = parseInt(matches[1]);
        var y = parseInt(matches[2]);
        var W = parseInt(matches[3]);
        var H = parseInt(matches[4]);

        return [x,y,W,H];
    }
    
    const cal_tragte = !!localStorage.getItem('caliber_trget') ? localStorage.getItem('caliber_trget'):'';
    let caliberTick:any = cal_tragte;
    if(caliberTick.indexOf('W') == -1 || caliberTick.indexOf('H') == -1 ){
      caliberTick = caliberTick+'W30H10';
    }

    function getTickCounter (str: any) {
      function getNumberSet(num: any,type: any){
        if(parseInt(num) > 0 && type == 'X') {
          return ['>',parseInt(num)];
        } else if(parseInt(num) < 0 && type == 'X') {
          return ['<', parseInt(String(num).replace('-', ''))];
        } else if(parseInt(num) > 0 && type == 'Y') {
          return ['^',parseInt(num)];
        }else{
          return ['v',parseInt(String(num).replace('-', ''))];
        }
      }
    
      const nums:any= getCoordinates(str);
      const [x1, y1] = getNumberSet(nums[0],'X');
      let [x2, y2] = getNumberSet(nums[1],'Y');; 
      let valueObj:any={};
      valueObj[x1]=y1;
      valueObj[x2]=y2;
      return valueObj;
    
    };
    
    
    const countCalObj = getTickCounter(caliberTick);
    
     //let ocrCalibration:any = !!localStorage.getItem('ocrCalibration') ? localStorage.getItem('ocrCalibration') : 7;

     const ocrCalibration:any = 7;
     for (var x in countCalObj) {
      if (x=='v' || x=='v') {
        yD += rect['y'] + ocrCalibration * countCalObj[x]; //down (add in y offset)
      }
      if (x=='>') {
        xD += rect['x'] + ocrCalibration * countCalObj[x]; //right (add in x offset)
      }
      if (x=='<') {
        xD += rect['x'] - ocrCalibration * countCalObj[x]; //left (minus in x offset)
        isLeft=true;
      }
      if (x=='^') {
        yD += rect['y'] - ocrCalibration * countCalObj[x]; //up (minus in y offset)
        isTopY=true;
      }
    }

    const all_nums:any= getCoordinates(caliberTick);
    const rectTop = yD;
    const rectLeft = xD;
    const rectWidth = ocrCalibration * all_nums[2];
    const rectHeight = ocrCalibration * all_nums[3];
      
      var stylesBox: CSSProperties = {
        position: 'absolute',
        left: `${scale * (rectLeft)}px`,
        top: `${scale * (rectTop)}px`,
        width:`${scale * (rectWidth)}px`,
        height:`${scale * (rectHeight)}px`,
        border: `2px solid green`,
      };

      
      if(yD!=0){
        var stylesY: CSSProperties = {
          position:         'absolute',
          left:             `${scale * (rectLeft)}px`,
          top:              `${scale * rect.y}px`,
          height:           `${(scale * Math.abs(rect.y-yD))}px`,
          borderLeft:           `2px solid red`
        }
        if(isTopY){
          let yHeight:any = stylesY['height'];
          let yTop:any = stylesY['top'];
          
          stylesY['top']=(Math.abs((parseFloat(yTop) - parseInt(yHeight))))
        }
    
      }else{
        yD=rect.y
      }
      

      if(yD)
      if(xD!=0){
        var stylesX: CSSProperties = {
          position:         'absolute',
          left:             `${scale * (rect.x)}px`,
          top:              `${scale * (rect.y)}px`,
          width:           `${(scale * Math.abs(rect.x-xD))}px`,
          borderBottom:           `2px solid red`
        }
        if(isLeft){
          stylesX['left']=(scale * Math.abs((rect.x)- Math.abs(rect.x-xD)))
          stylesY['left']=(scale * Math.abs((rect.x)- Math.abs(rect.x-xD)))
        }
     
      }
        

      return (
        <div>
        <div style={styles}></div>
        <div style={stylesY}></div>
        <div style={stylesX}></div>
        <div style={stylesBox}></div>
        </div>
      )
    }else{
      return (
        <div>
        {/* <div style={styles}></div> */}
        <div data-for='serial' style={serialElementStyles}>{serial}</div>
        <div data-for='circle' style={circleElementStyles}></div>
        <div data-for='text' style={textElementStyles}>{match.words[0].word.WordText}</div>
        </div>
      )
       
    }
 
  }

  colorForRectType (rectType: DesktopScreenshot.RectType) {
    switch (rectType) {
      case DesktopScreenshot.RectType.Match:
        return 'orange'

      case DesktopScreenshot.RectType.BestMatch:
        return '#ff0000'

      case DesktopScreenshot.RectType.Reference:
      case DesktopScreenshot.RectType.ReferenceOfBestMatch:
        return '#00ff00'
    }
  }

  render () {
    return (
      <div className="desktop-screenshot-editor">
        <div className="top-bar">
          <button
            onClick={() => {
              this.setState({
                scale: this.state.scale < 1 ? 1 : 0.5
              }, () => {
                setTimeout(() => {
                  this.updateImagePageRect()
                }, 1000)
              })
            }}
          >
            {this.state.scale < 1 ? 'Show Original Size' : 'Show 50%'}
          </button>

          <button
            disabled={this.state.mode === DesktopScreenshot.RequestType.Capture}
            onClick={() => {
              this.resetToMode(DesktopScreenshot.RequestType.Capture)
              .then(() => this.selectAreaOnImage())
              .then(dataUrl => {
                if (dataUrl) return csIpc.ask('DESKTOP_EDITOR_ADD_VISION_IMAGE', { dataUrl })
              })
            }}
          >
            {this.state.mode === DesktopScreenshot.RequestType.Capture ? 'Selecting...' : 'Select Image'}
          </button>
        </div>
        <div className="editing-area">
          {this.state.imageUrl.length > 0 ? (
            <img
              ref={(ref: HTMLImageElement) => { (this as any).$image = ref }}
              style={{
                width:  screen.width * this.state.scale + 'px',
                height: screen.height * this.state.scale + 'px',
              }}
              src={this.state.imageUrl}
            />
          ) : null}

          <div className="highlight-rect-list">
            { this.state.mode !== DesktopScreenshot.RequestType.DisplayVisualX  ? (this.state.rects?.map((rect, i) => (
              <div
                key={i}
                style={{
                  top:    (rect.y * this.state.scale) + 'px',
                  left:   (rect.x * this.state.scale) + 'px',
                  width:  (rect.width * this.state.scale) + 'px',
                  height: (rect.height * this.state.scale) + 'px',
                  border: `1px solid ${this.colorForRectType(rect.type)}`,
                  color:  this.colorForRectType(rect.type)
                }}
                className="highlight-rect"
              >
                <div className={cn('score', this.cornerPosition(rect))}>
                  {rect.text
                      ? (rect.text + (this.state.rects.length > 1 ? `#${rect.index + 1}` : ''))
                      : ((rect.score !== undefined ? rect.score.toFixed(2) : '') + `#${rect.index + 1}`)
                  }
                </div>
              </div>
            ))) :            
            (this.state.rects?.map((rect, i) => (
              <div
                key={i}
                style={{
                  top:    ((rect.y * this.state.scale ) - 8) + 'px', // half of 16px 
                  left:   ((rect.x * this.state.scale ) - 8) + 'px', // half of 16px
                  color:  this.colorForRectType(rect.type),                  
                }}
                className="highlight-rect"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="16px" height="16px">
                  <line x1="8" y1="8" x2="56" y2="56" stroke="red" stroke-width="12"></line>
                  <line x1="56" y1="8" x2="8" y2="56" stroke="red" stroke-width="12"></line>
                </svg>
              </div>
            )))}
          </div>

          <div className="ocr-match-list">
            {this.state.ocrMatches.map((match, i) => (
              <div key={i}>
                {match.words.map((pw, j) => (
                  <div
                    key={j}
                    style={this.ocrMatchStyle(pw, match)}
                    className="ocr-match"
                  >
                    {pw.word.WordText}
                  </div>
                ))}
                {[
                  OcrHighlightType.Matched, 
                  OcrHighlightType.TopMatched, 
                  OcrHighlightType.WildcardMatched, 
                  OcrHighlightType.WildcardTopMatched
                ].includes(match.highlight)
                 ? (
                    this.renderRectForOcrMatch(match,allState, (i))                  
                ) : null}
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }
}
