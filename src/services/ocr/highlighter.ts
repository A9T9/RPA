import { setStyle } from "../../common/dom_utils"
import { singletonGetter } from "../../common/ts_utils"
import { getState,updateState } from '../../ext/common/global_state'
import {
  IOcrMatchesHighlighter,
  OcrTextSearchMatchForHighlight,
  OcrPositionedWord,
  OcrHighlightType,
  OcrTextSearchMatch
} from "./types"
import { ocrMatchRect } from "./index"
import { any } from "prop-types"

type HighlightWordOptions = {
  highlight:      OcrHighlightType;
  shouldScrollTo: boolean;
}

export class OcrMatchesHighlighter implements IOcrMatchesHighlighter {
  private $container: HTMLElement
  private stores: {}

  constructor () {
    this.$container = this.createContainer()
    this.stores = {}
  }

  clear (): void {
    //Array.from(this.$container.childNodes).forEach(node => node.remove())
    Array.from(this.$container.childNodes).forEach((node: any) => {
      if (node.getAttribute('id') !== 'rect-ocr-box') {
        node.remove();
      }
    });
        
  }

  updateStates (store:any): void {
    this.stores =store;
  }

  highlightRelative (rect:any): void {
     const $rect = document.createElement('div')

    setStyle($rect, {
      boxSizing:        'border-box',
      position:         'absolute',
      left:             `${rect.x}px`,
      top:              `${rect.y}px`,
      width:            `${rect.width}px`,
      height:           `${rect.height}px`,
      border:           `2px solid #fe1492`,
      background:       `transparent`,
      pointerEvents:    'none',
      ...({})
    })

    this.$container.appendChild($rect)
  }

  highlight (matches: OcrTextSearchMatchForHighlight[], showOcrOverlay: boolean = false): void {
    this.clear()
    matches.forEach((match, i) => {
      this.createHighlightForMatch(match, i, showOcrOverlay)
    })
  }

  private createHighlightForMatch (match: OcrTextSearchMatchForHighlight, matchIndex?: number|undefined, showOcrOverlay?: boolean) {

    console.log('match:>> ', match)
    console.log('match.words:>> ', match.words)
    console.log('matchIndex:>> ', matchIndex)
    console.log('showOcrOverlay:>> ==', showOcrOverlay)


    // match.words.forEach((word, i) => {
    //   this.createHighlightForWord(word, {
    //     highlight:        match.highlight,
    //     shouldScrollTo:   false
    //   }, matchIndex)
    // })

    if (showOcrOverlay) {
      match.words.forEach((word, i) => {
        this.createHighlightForWord(word, {
          highlight:        match.highlight,
          shouldScrollTo:   false
        }, matchIndex, showOcrOverlay)
      })
    } else if (matchIndex && match.words.length === 1 ) {
      let singleWord = match.words[0];
      this.createHighlightForWord(singleWord, {
        highlight:        match.highlight,
        shouldScrollTo:   false  
      }, matchIndex)
    } else if (matchIndex && match.words.length > 1 && match.highlight !== OcrHighlightType.Identified) {

      let isSequential = true
      let lastRightXOnMultipleLines = match.words.reduce(( lastRight: number, word) => { 
        if(!isSequential) return lastRight
        if (word.word.Left < lastRight) {
          isSequential = false
          return lastRight
        }
         
        lastRight = word.word.Left + word.word.Width
        console.log('lastRight:>> ', lastRight)
        return lastRight
        
      }, 0)
      console.log('isSequential:>> ', isSequential)
      console.log('lastRightXOnMultipleLines:>> ', lastRightXOnMultipleLines)

      let combinedWidth = 0

      if(!isSequential){
        combinedWidth = lastRightXOnMultipleLines - match.words[0].word.Left
      } else {
        // if not sequential, calculate the combined width 
        let leftMostWord = match.words.reduce((acc, word) => {
          return acc.word.Left < word.word.Left ? acc : word
        })
        let rightMostWord = match.words.reduce((acc, word) => {
          return acc.word.Left + acc.word.Width > word.word.Left + word.word.Width ? acc : word
        })      
        combinedWidth = rightMostWord.word.Left + rightMostWord.word.Width - leftMostWord.word.Left       
      }
      console.log('combinedWidth:>> ', combinedWidth) 

      let combinedWord : OcrPositionedWord = {
        position: {
          pageIndex: match.words[0].position.pageIndex,
          lineIndex: match.words[0].position.lineIndex,
          wordIndex: match.words[0].position.wordIndex
        },
        word: {
          WordText: match.words.map((word) => word.word.WordText).join(' '),
          Height: match.words[0].word.Height,  
          Width: combinedWidth,
          Top: match.words[0].word.Top,
          Left: match.words[0].word.Left
        }
      }

      this.createHighlightForWord(combinedWord, {
        highlight:        match.highlight,
        shouldScrollTo:   false  
      }, matchIndex)

    } else {
        // grey out the identified words
        match.words.forEach((word, i) => {
          this.createHighlightForWord(word, {
            highlight:        match.highlight,
            shouldScrollTo:   false
          }, matchIndex)
        })
    }

    // console.log('this.stores:>> ', this.stores)

    if (match.highlight === OcrHighlightType.TopMatched || match.highlight === OcrHighlightType.WildcardTopMatched) {
      const stores:any = this.stores;
      // if (stores) {
        if((stores['curent_cmd'] == "XClickTextRelative" || stores['curent_cmd'] == "XMoveTextRelative" )){
          this.createRectForMatch(match)
        }
        if((stores['curent_cmd'] == "OCRExtractbyTextRelative") || (stores['curent_cmd'] == "visionLimitSearchAreabyTextRelative")) {            
          this.createRectForMatchOCrExtract(match)
        }
      // }   
    }
  }

  private createHighlightForWord (pw: OcrPositionedWord, options: HighlightWordOptions, matchIndex: any, showOcrOverlayOnly: boolean = false): void {
    const $mark = document.createElement('div')
    $mark.innerText = pw.word.WordText

    // console.log(`pw.word.WordText matchIndex ${matchIndex} text:>> `, pw.word.WordText)
    // console.log('options:>> ', options)

    const styleByType = (() => {
      switch (options.highlight) {
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

        case OcrHighlightType.WildcardMatched:          
          return {
            color: '#fe1492',
            backgroundColor: 'rgba(255, 215, 15, 0.5)'
          }
        
         case OcrHighlightType.WildcardTopMatched:
          return {
            color: '#fe1492',  
            backgroundColor: 'rgba(255, 215, 15, 0.5)' 
          } 
      }
    })()

    setStyle($mark, {
      boxSizing:        'border-box',
      position:         'absolute',
      left:             `${pw.word.Left}px`,
      top:              `${pw.word.Top}px`,
      width:            `${pw.word.Width}px`,
      height:           `${pw.word.Height}px`,
      lineHeight:       `${pw.word.Height}px`,
      fontSize:         `${pw.word.Height * 0.8}px`,
      fontWeight:       'bold',
      textAlign:        'center',
      pointerEvents:    'none',
      ...styleByType
    })

    this.$container.appendChild($mark)
    

     let showSerial = (!showOcrOverlayOnly && 
      ( options.highlight === OcrHighlightType.Matched ||
      options.highlight === OcrHighlightType.TopMatched ||
      options.highlight === OcrHighlightType.WildcardMatched || 
      options.highlight === OcrHighlightType.WildcardTopMatched ))
      

    // Highlight match with a match serial
    if  (showSerial) {
      $mark.innerText = ''

      const $serialElement = document.createElement('span')
      $serialElement.innerText = `${matchIndex}`
      setStyle($serialElement, {
        position: 'absolute',
        top: '-15px',
        left: '-15px',
        fontSize: '10px',
        lineHeight: '10px',
        color: '#e31399',
        border: '2px solid',
        padding: '2px 4px',
        borderRadius: '4px'
      })
      // append the serial element to the mark
      $mark.appendChild($serialElement)

      const $circleElement = document.createElement('span')
      setStyle($circleElement, {
        position: 'absolute',
        border: '3px solid #e31399ba',
        padding: '3px 3px',
        borderRadius: '10px',
        right: 'calc(50% - 6px)',
        bottom: 'calc(50% - 6px)'
      })
      // append the after element to the mark
      $mark.appendChild($circleElement)

      const $textElement = document.createElement('div')
      $textElement.innerText = pw.word.WordText
      setStyle($textElement, {
        position: 'absolute',
        width: '100%',
        top: '100%',
        left: '50%',
        transform: 'translateX(-50%)',
        fontSize: '18px',
        fontWeight: 'bold',
        color: '#4697fc',
      })
      // append the text element to the mark
      $mark.appendChild($textElement)
    }

    if (options.shouldScrollTo) {
      $mark.scrollIntoView({ block: 'center' })
    }
  }

  private createRectForMatchOCrExtract (match: OcrTextSearchMatch, styles?: Record<string, string>) {
    (async()=>{
      const allState= await getState();
      const rect  = ocrMatchRect(match)
      const $rect = document.createElement('div')
      const $rectY = document.createElement('div')
      const $rectX = document.createElement('div')
      const $rectBox = document.createElement('div')
      $rectBox.setAttribute('id', 'rect-ocr-box');
      $rectY.setAttribute('id', 'rect-ocr-box');
      $rectX.setAttribute('id', 'rect-ocr-box');
      $rect.setAttribute('id', 'rect-ocr-box');
      
      
      setStyle($rect, {
        boxSizing:        'border-box',
        position:         'absolute',
        left:             `${rect.x}px`,
        top:              `${rect.y}px`,
        width:            `${rect.width}px`,
        height:           `${rect.height}px`,
        border:           `2px solid #fe1492`,
        background:       `transparent`,
        pointerEvents:    'none',
        ...(styles || {})
      })
      
      
      let markerDiv="";
      var stylesY:any = {}
      var stylesX:any = {}
      var stylesBox:any = {}
      let xD:any=0,yD:any=0;
      let isLeft:any=false;
      let isTopY:any=false;
      let isXavilable:any=false;
      const stores:any = this.stores;
      
      
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
      
            const cal_tragte:any = !!stores['caliber_trget'] ? stores['caliber_trget']:'';
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
      
            let ocrCalibration = allState['ocrCalibration'] ? allState['ocrCalibration'] : 6;
            const isDesktopMode = stores.isDesktopMode;
            if(isDesktopMode == "false"){
              ocrCalibration = 7;
            }
      
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
      
            var stylesBox:any = {
              position: 'absolute',
              left: rectLeft + 'px',
              top: rectTop + 'px',
              width: rectWidth + 'px',
              height: rectHeight + 'px',
              border: `2px solid green`,
            };
      
      
            if(yD!=0){
              stylesY = {
                position:         'absolute',
                left:            `${rectLeft}px`,
                top:              `${rect.y}px`,
                height:           `${(Math.abs(rect.y-yD))}px`,
                borderLeft:           `2px solid red`
              }
              if(isTopY){
                let yHeight:any = stylesY['height'];
                let yTop:any = stylesY['top'];
      
                stylesY['top']=(Math.abs((parseFloat(yTop) - parseInt(yHeight))))+'px'
              }
             
            }else{
              yD=rect.y
            }
      
            if(yD)
              if(xD!=0){
                stylesX = {
                  position:         'absolute',
                  left:             `${(rect.x)}px`,
                  top:              `${rect.y}px`,
                  width:           `${(Math.abs(rect.x-xD))}px`,
                  borderBottom:           `2px solid red`
                }
                if(isLeft){
                  stylesX['left']=(Math.abs((rect.x)- Math.abs(rect.x-xD)))+'px'
                  stylesY['left']=(Math.abs((rect.x)- Math.abs(rect.x-xD)))+'px'
                }
                isXavilable=true;
              }
              setStyle($rectX,stylesX);
      
            setStyle($rectBox,stylesBox);
            setStyle($rectY,stylesY);
      
            localStorage.removeItem('curent_cmd');
            localStorage.removeItem('caliber_trget');
            localStorage.removeItem('ocrCalibration');
            this.$container.appendChild($rect)
            this.$container.appendChild($rectY)
            this.$container.appendChild($rectX)
            this.$container.appendChild($rectBox)

            setTimeout(function(){
            const elementsIds = document.querySelectorAll('[id="rect-ocr-box"]');
              elementsIds.forEach(element => {
              element.removeAttribute('id');
              });
            },5000)
      
  })()
  }

  private createRectForMatch (match: OcrTextSearchMatch, styles?: Record<string, string>) {
    (async()=>{

    const allState= await getState();
    const rect  = ocrMatchRect(match)
    const $rect = document.createElement('div')
    const $rectY = document.createElement('div')
    const $rectX = document.createElement('div')
    const $rectBox = document.createElement('div')

    setStyle($rect, {
      boxSizing:        'border-box',
      position:         'absolute',
      left:             `${rect.x}px`,
      top:              `${rect.y}px`,
      width:            `${rect.width}px`,
      height:           `${rect.height}px`,
      border:           `2px solid #fe1492`,
      background:       `transparent`,
      pointerEvents:    'none',
      ...(styles || {})
    })

    
    let markerDiv="";
    var stylesY:any = {}
    var stylesX:any = {}
    var stylesBox:any = {}
    let xD:any=0,yD:any=0;
    let isLeft:any=false;
    let isTopY:any=false;
    let isXavilable:any=false;
    
    const stores:any = this.stores;
    if((stores['curent_cmd'] == "XClickTextRelative" || stores['curent_cmd'] == "XMoveTextRelative") ){
      function getTickCounter (str: any) {
        function getNumberSet(num: any,type: any){
            if(parseInt(num) > 0 && type == 'X') {
              return ['>',parseInt(num)];
            } else if(parseInt(num) <= 0 && type == 'X') {
              return ['<', parseInt(num.replace('-', ''))];
            } else if(parseInt(num) > 0 && type == 'Y') {
              return ['^',parseInt(num)];
            } else if(parseInt(num) <= 0 && type == 'Y'){
              return ['v',parseInt(num.replace('-', ''))];
            } else {
              throw new Error('Invalid input');
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
      const cal_tragte:any = !!stores['caliber_trget'] ? stores['caliber_trget']:'';
      //const caliberTick = cal_tragte.split('#R')[1];//old methode
      const caliberTick = cal_tragte;
      const countCalObj = getTickCounter(caliberTick);
      //const ocrCalibration:any = !!localStorage.getItem('ocrCalibration') ? localStorage.getItem('ocrCalibration'):6;
      let ocrCalibration = allState['ocrCalibration'] ? allState['ocrCalibration'] : 6;
      const isDesktopMode = stores.isDesktopMode;
      if(isDesktopMode == "false"){
        ocrCalibration = 7;
      }
      for (var x in countCalObj) {
        if (x=='v') {
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
      stylesY = {
        position:         'absolute',
        left:             `${(rect.x+rect.width/2)}px`,
        top:              `${rect.y}px`,
        height:           `${(Math.abs(rect.y-yD))}px`,
        borderLeft:           `2px solid red`
      }
      if(isTopY){
        let yHeight:any = stylesY['height'];
        let yTop:any = stylesY['top'];
        
        stylesY['top']=(Math.abs((parseFloat(yTop) - parseInt(yHeight))))+'px'
      }
      setStyle($rectY,stylesY);
    }else{
      yD=rect.y
    }
     
    if(yD)
    if(xD!=0){
      stylesX = {
        position:         'absolute',
        left:             `${(rect.x+rect.width/2)}px`,
        top:              `${yD}px`,
        width:           `${(Math.abs(rect.x-xD))}px`,
        borderBottom:           `2px solid red`
      }
      if(isLeft){
        stylesX['left']=(Math.abs((rect.x+ (rect.width/2))- Math.abs(rect.x-xD)))+'px'
      }
      isXavilable=true;
    }
    setStyle($rectX,stylesX);
    if(isXavilable){
      let xWidth:any = stylesX['width'];
      let xLeft:any = stylesX['left'];
      let leftNewX = isLeft? (parseFloat(xLeft) - (20)) :(parseFloat(xLeft) + (parseFloat(xWidth)));
      var stylesBox:any  = {
        position:         'absolute',
        left:             `${leftNewX}px`,
        top:              `${(yD)-((20/2))}px`,
        width:            `${(20)}px`,
        height:           `${(20)}px`,
        border:           `2px solid green`
      }
    }else{
      let yLeft:any = stylesY['left'];
      let yHeight:any = stylesY['height'];
      let leftNewY:any = parseFloat(yLeft);
      let yTop:any = stylesY['top'];
      let toptNewY = isTopY? (parseFloat(yTop) - (20)) :(parseFloat(yTop) + (parseFloat(yHeight)));

      
      var stylesBox:any = {
        position:         'absolute',
        left:             `${leftNewY-((20/2))}px`,
        top:              `${toptNewY}px`,
        width:            `${(20)}px`,
        height:           `${(20)}px`,
        border:           `2px solid green`
      }
    }
    setStyle($rectBox,stylesBox);
    }  

    localStorage.removeItem('curent_cmd');
    localStorage.removeItem('caliber_trget');
    localStorage.removeItem('ocrCalibration');
    this.$container.appendChild($rect)
    this.$container.appendChild($rectY)
    this.$container.appendChild($rectX)
    this.$container.appendChild($rectBox)
    
  })()
  }

  private createContainer (): HTMLElement {
    const $div = document.createElement('div')
    document.documentElement.appendChild($div)
    return $div
  }
}

export const getOrcMatchesHighlighter = singletonGetter(() => new OcrMatchesHighlighter())
