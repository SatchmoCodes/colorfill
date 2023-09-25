import { useState } from 'react'
import { useEffect } from 'react'
import { json, redirect } from "@remix-run/node";
import gameStyle from '~/styles/game.css'
import generateBoard from './progGenerator'
import { Link } from "@remix-run/react";

import { useUser } from "~/utils";
import { requireUserId } from "~/session.server";
import { Form, useActionData, useLoaderData} from '@remix-run/react'
import { createBoard} from '~/models/board.server'
import { createScore} from '~/models/score.server'
import { getBoard } from '~/models/board.server'
import invariant from "tiny-invariant";

import { useFetcher } from "@remix-run/react";
import { getBestScore } from '../models/score.server';


export const loader = async ({ params, request }) => {
    const userId = await requireUserId(request);
    invariant(params.boardId, "boardId not found");
  
    const board = await getBoard({ id: params.boardId });
    if (!board) {
      throw new Response("Not Found", { status: 404 });
    }
    let squareData = generateBoard(board.boardData)
    let squareGrowth = []
    squareData.forEach(arr => {
        let newArr = new Array(arr.length).fill(false)
        squareGrowth.push(newArr)
    })
    let bestScore = await getBestScore({ userId, gamemode: 'Progressive', size: '18' })
    return json({ board, squareData, squareGrowth, bestScore });
  };

  export const action = async ({ request }) => {
    const userId = await requireUserId(request)
    const formData = await request.formData()
    let score = formData.get('score')
    score = parseInt(score)
    const boardId = formData.get('boardId')
    const userName = formData.get('username')
    const submitType = formData.get('submitType')
    const turnlog = formData.get('turnLog')
    let boardSize = formData.get('boardSize')
    let boardData = ''
    const gamemode = 'Progressive'

    if (submitType == 'submit') {
      console.log('subasdfasdf')
      const newScore = await createScore({ score, gamemode, turnlog, userId, boardId, boardSize, userName})
    }
    if (submitType == 'newBoard') {
      for (let i = 0; i < 3765; i++) {
        boardData += Math.floor(Math.random() * 5)
      }
      const newBoard = await createBoard({ size: '18', boardData, userId})
      return redirect(`/proggame/${newBoard.id}`)
    }
    return null
  }

const colors = ['var(--red)', 'var(--orange)', 'var(--yellow)', 'var(--green)', 'var(--blue)']
const paletteColors = ['--red', '--orange', '--yellow', '--green', '--blue']
let totalCaptured = 0
let turnCount = 0
let dimensions = 5

let squareCounterArr = [
  {
    id: 0,
    color: 'var(--red)',
    count: 0
  },
  {
    id: 1,
    color: 'var(--orange)',
    count: 0
  },
  {
    id: 2,
    color: 'var(--yellow)',
    count: 0
  },
  {
    id: 3,
    color: 'var(--green)',
    count: 0
  },
  {
    id: 4,
    color: 'var(--blue)',
    count: 0
  }
]

let parValue = 10
let roundNumber = 1
let totalScoreValue = 0
let roundScoreValue
let currentRoundValue

let hasRun = false
let startPoint
let growthArr
let tempSquareArr
let turnLogArr = []
let fullTurnLogArr = []
let turnLogJSON
let hole = 0



function App() {
  const user = useUser()
  const fetcher = useFetcher()
  const data = useLoaderData()

  const [count, setCount] = useState(0) //track # of turns
  const [colorState, setColorState] = useState(data.squareData[hole]) //tracks color of entire board
  const [squareCounter, setSquareCounter] = useState(squareCounterArr) //sets number of squares left
  const [highScore, setHighScore] = useState(data.bestScore == null ? '' : data.bestScore.score)
  const [selectedColor, setSelectedColor] = useState(data.squareData[hole][0].color) //sets selected color at bottom
  const [saveActive, setSaveActive] = useState(false)
  const [radarActive, setRadarActive] = useState(false)
  const [growth, setGrowth] = useState(data.squareGrowth[hole]) //class animation on capture
  const [customBoardSize, setCustomBoardSize] = useState('')
  const [boardSize, setBoardSize] = useState(dimensions)
  const [grid, setGrid] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const [complete, setComplete] = useState(false)

  const [turnLog, setTurnLog] = useState(turnLogArr)

  const [palColor, setPalColor] = useState(null)
  

//   progressive unique state
  const [par, setPar] = useState(parValue)
  const [roundScore, setRoundScore] = useState(roundScoreValue)
  const [totalScore, setTotalScore] = useState(totalScoreValue)
  const [holeNumber, setHoleNumber] = useState(hole)


  const [boardId, setBoardId] = useState(data.board.id)

  useEffect(() => {
    if (!hasRun) {
      if (localStorage.getItem('recentId') == data.board.id && localStorage.getItem('playing') == 'true') {
        let fullDataArr = JSON.parse(localStorage.getItem('boardData'))
        console.log(fullDataArr)
        tempSquareArr = fullDataArr[parseInt(localStorage.getItem('hole'))]
        setGrowth(JSON.parse(localStorage.getItem('growthArr')))
        turnCount = localStorage.getItem('turnCount')
        totalCaptured = localStorage.getItem('totalCaptured')
        squareCounterArr = JSON.parse(localStorage.getItem('squareCounter'))
        parValue = parseInt(localStorage.getItem('par'))
        roundScoreValue = parseInt(localStorage.getItem('roundScore'))
        totalScoreValue = parseInt(localStorage.getItem('totalScore'))
        dimensions = (parseInt(localStorage.getItem('dimensions')))
        hole = parseInt(localStorage.getItem('hole'))
        roundNumber = parseInt(localStorage.getItem('roundNumber'))
        fullTurnLogArr = JSON.parse(localStorage.getItem('fullLogArr'))
        if (fullTurnLogArr[hole] != undefined) {
          turnLogArr = [...fullTurnLogArr[hole]]
        }
        console.log(fullTurnLogArr)
        setSelectedColor(localStorage.getItem('selectedColor'))
        setBoardSize(dimensions)
        setPar(parValue)
        setRoundScore(roundScoreValue)
        setTotalScore(totalScoreValue)
        setSquareCounter(squareCounterArr)
        setCount(turnCount)
        setHoleNumber(hole)
        setTurnLog(turnLogArr)
      }
      else {
        tempSquareArr = JSON.parse(JSON.stringify(data.squareData[hole]))
        tempSquareArr.forEach(sq => {
          squareCounterArr.forEach(counter => {
              if (sq.color == counter.color && !sq.index == 0) {
                counter.count++
              }
            })
        })
      }
      console.log(tempSquareArr[0])
      // turnLogArr = [...Array(18).map(e => Array(18))]
      // fullTurnLogArr = [...Array(18).map(e => Array(18))]
      fullTurnLogArr = [[]]

      setSquareCounter(squareCounterArr)
      data.squareGrowth[0][0] = 'captured'
      setGrowth(data.squareGrowth)
      tempSquareArr.forEach((sq, index) => {
        if (sq.captured) {
          captureCheck(sq.color, index);
        }
      });
      data.squareData[hole] = JSON.parse(JSON.stringify(tempSquareArr))
      setColorState(tempSquareArr)
      localStorage.getItem('grid') == 'true' && setGrid(true)
      hasRun = true
      }
      // for (let i = 0; i < 5; i++) {
      //   document.documentElement.style.setProperty(colors[i], localStorage.getItem('palColor', i));
      // }

      for (let i = 0; i < 5; i++) {
        if (localStorage.getItem(paletteColors[i])) {
          document.documentElement.style.setProperty(paletteColors[i], localStorage.getItem(paletteColors[i]))
        } 
      }
  }, []);

  function colorChange(color) {
    tempSquareArr = JSON.parse(JSON.stringify(data.squareData[hole]))
    setColorState(tempSquareArr)
    let numberCaptured = totalCaptured
    data.squareGrowth[hole].map((e, index) => {
      if (e == 'predicted') {
        data.squareGrowth[hole][index] = false
      }
    })
    setGrowth(data.squareGrowth[hole])
    !radarActive && turnCount++
    !radarActive && setSelectedColor(color)
      tempSquareArr.forEach((sq, index) => {
        if (sq.captured) {
          captureCheck(color, index)
        }
      })
    setColorState(tempSquareArr)
    setCount(turnCount)
    if (radarActive) {
      tempSquareArr = JSON.parse(JSON.stringify(data.squareData[hole]))
    } 
    if (!radarActive) {
      numberCaptured = totalCaptured - numberCaptured
      let captureObj = {
        captured: numberCaptured,
        color: color
      }
      turnLogArr.push(captureObj)
      fullTurnLogArr[hole] = [...turnLogArr]
      let newArrayCauseReactIsLame = [...turnLogArr]
      setTurnLog(newArrayCauseReactIsLame)
    }
    data.squareData[hole] = JSON.parse(JSON.stringify(tempSquareArr))
    if (turnCount >= 1) {
      saveBoardInfo(color)
    }
    if (totalCaptured >= (boardSize * boardSize) - 1) {
        currentRoundValue = turnCount - parValue
        setRoundScore(currentRoundValue)
        totalScoreValue += currentRoundValue
        setTotalScore(totalScoreValue)
        roundNumber <= 17 ? document.querySelector('.roundDialog').show() : document.querySelector('.endDialog').show()
        if (roundNumber >  17) {
          setComplete(true)
          localStorage.setItem('playing', 'false')
          let turnLogObj = new Object()
          turnLogObj.turnLog = fullTurnLogArr
          turnLogJSON = JSON.stringify(turnLogObj)
        }
    }
    console.log(localStorage.getItem('fullLogArr'))
    console.log(JSON.parse(localStorage.getItem('fullLogArr')))
  }

  useEffect(() => {
    let x = document.querySelectorAll('.row')
    document.querySelectorAll('.row') != null && document.querySelectorAll('.row')[x.length - 1].scrollIntoView({ behavior: "smooth", block: "end", inline: "nearest" });
  }, [turnLog])

  useEffect(() => {
    if (complete) {
      fetcher.submit(document.querySelector('.scoreData'))
    }
  }, [complete])

  function updateSquareCount(color) {
    squareCounterArr.forEach(sq => {
      console.log(sq)
      if (sq.color == color) {
        sq.count--
      }
    })
    // setSquareCounter(squareCounterArr)
    // setSquareCounter(prevSquareCounter => 
    //   prevSquareCounter.map((sq) => {
    //     if (sq.color === color) {
    //       let currentCount = parseInt(sq.count);
    //       return { ...sq, count: currentCount - 1 };
    //     } else {
    //       return sq;
    //     }
    //   })
    // );
  }

  function captureCheck(color, index) {
    !radarActive ? tempSquareArr[index].fakeColor = color : tempSquareArr[index].fakeColor = data.squareData[hole][index].fakeColor
    tempSquareArr[index].color = color
    // right
    if (tempSquareArr[index + 1] && tempSquareArr[index + 1].captured == false) {
      if (tempSquareArr[index].color == tempSquareArr[index + 1].color && tempSquareArr[index].rowIndex == tempSquareArr[index + 1].rowIndex) {
        tempSquareArr[index + 1].color = color
        tempSquareArr[index + 1].captured = true
        !radarActive && updateSquareCount(color)
        !radarActive && totalCaptured++
        !radarActive ? data.squareGrowth[hole][index + 1] = 'captured' : data.squareGrowth[hole][index + 1] = 'predicted'
        setGrowth(data.squareGrowth[hole])
        tempSquareArr[index + 1].colIndex <= dimensions && captureCheck(color, index + 1)
      }
    }
    //left
    if (tempSquareArr[index - 1] && tempSquareArr[index - 1].captured == false) {
      if (tempSquareArr[index].color == tempSquareArr[index - 1].color && tempSquareArr[index].rowIndex == tempSquareArr[index - 1].rowIndex) {
        tempSquareArr[index - 1].color = color
        tempSquareArr[index - 1].captured = true
        !radarActive && updateSquareCount(color)
        !radarActive && totalCaptured++
        !radarActive ? data.squareGrowth[hole][index - 1] = 'captured' : data.squareGrowth[hole][index - 1] = 'predicted'
        setGrowth(data.squareGrowth[hole])
        tempSquareArr[index - 1].colIndex <= dimensions && captureCheck(color, index - 1)
      }
    }
    // // // // down
    if (tempSquareArr[index + dimensions] && tempSquareArr[index + dimensions].captured == false) {
      if (tempSquareArr[index].color == tempSquareArr[index + dimensions].color) {
        tempSquareArr[index + dimensions].color = color
        tempSquareArr[index + dimensions].captured = true
        !radarActive && updateSquareCount(color)
        !radarActive && totalCaptured++
        !radarActive ? data.squareGrowth[hole][index + dimensions] = 'captured' : data.squareGrowth[hole][index + dimensions] = 'predicted'
        setGrowth(data.squareGrowth[hole])
        tempSquareArr[index + dimensions].rowIndex <= dimensions && captureCheck(color, index + dimensions)
      }
    }
    // // //up
    if (tempSquareArr[index - dimensions] && tempSquareArr[index - dimensions].captured == false) {
      if (tempSquareArr[index].color == tempSquareArr[index - dimensions].color) {
        tempSquareArr[index - dimensions].color = color
        tempSquareArr[index - dimensions].captured = true
        !radarActive && updateSquareCount(color)
        !radarActive && totalCaptured++
        !radarActive ? data.squareGrowth[hole][index - dimensions] = 'captured' : data.squareGrowth[hole][index - dimensions] = 'predicted'
        setGrowth(data.squareGrowth[hole])
        tempSquareArr[index - dimensions].rowIndex <= dimensions && captureCheck(color, index - dimensions)
      }
    }
  }

  function handleReset() {
    console.log(data.squareData)
    turnCount = 0
    hole++
    setHoleNumber(hole)
    roundNumber++
    if (roundNumber < 21) {
      parValue = parValue + 2
      dimensions++
    }
    else {
        dimensions = 5
        parValue = 10
        roundNumber = 10
        totalScoreValue = 0
        setPar(parValue)
        setTotalScore(totalScoreValue)
        document.querySelector('.endDialog').close()
    }
    tempSquareArr = JSON.parse(JSON.stringify(data.squareData[hole]))
    setBoardSize(dimensions)
    setPar(parValue)
    setColorState(tempSquareArr)
    setGrowth(data.squareGrowth[hole])
    setCount(0)
    totalCaptured = 0
    squareCounterArr.forEach(counter => {
      counter.count = 0
    })

    tempSquareArr.forEach(sq => {
      squareCounterArr.forEach(counter => {
        if (sq.color == counter.color && !sq.index == 0) {
          counter.count++
        }
      })
    })
    
    setSquareCounter(squareCounterArr)
   
    tempSquareArr.forEach((sq, index) => {
      if (sq.captured) {
        console.log('checking')
        captureCheck(sq.color, index);  
      }
    });
    setColorState(tempSquareArr)
    setSelectedColor(tempSquareArr[0].color)
    data.squareData[hole] = JSON.parse(JSON.stringify(tempSquareArr))
    let color = tempSquareArr[0].color
    saveBoardInfo(color)
    turnLogArr = []
    fullTurnLogArr.push(turnLogArr)
    setTurnLog(turnLogArr)
    document.querySelector('.roundDialog').close()
  }

  function handlePredict() {
    console.log(data.squareData[hole])
    setRadarActive(!radarActive)
    setColorState(data.squareData[hole])
    data.squareGrowth[hole].forEach((e, index) => {
      if (e == 'predicted') {
        data.squareGrowth[hole][index] = false
      }
    })
   
    setGrowth(data.squareGrowth[hole])
  }

  const handleGridToggle = (event) => {
    !grid ? localStorage.setItem('grid', 'true') : localStorage.setItem('grid', 'false')
    setGrid(!grid)
  }

  function handlePaletteSwap(event) {
    const colors = ['--red', '--orange', '--yellow', '--green', '--blue']
    // for (let i = 0; i < 5; i++) {
    //   palColorArr.push(event.target.parentElement.querySelectorAll('.palColor')[i].style.background)
    //   document.documentElement.style.setProperty(colors[i], `${event.target.parentElement.querySelectorAll('.palColor')[i].style.background}`);
    // }
    // localStorage.setItem('--red', event.target.parentElement.querySelectorAll('.palColor')[0].style.background)
    // localStorage.setItem('--orange', event.target.parentElement.querySelectorAll('.palColor')[1].style.background)
    // localStorage.setItem('--yellow', event.target.parentElement.querySelectorAll('.palColor')[2].style.background)
    // localStorage.setItem('--green', event.target.parentElement.querySelectorAll('.palColor')[3].style.background)
    // localStorage.setItem('--blue', event.target.parentElement.querySelectorAll('.palColor')[4].style.background)
    for (let i = 0; i < 5; i++) {
      localStorage.setItem(colors[i], event.target.parentElement.querySelectorAll('.palColor')[i].style.background)
      document.documentElement.style.setProperty(colors[i], `${event.target.parentElement.querySelectorAll('.palColor')[i].style.background}`)
    }
  }

  function saveBoardInfo(color) {
      console.log('new board saved')
      localStorage.setItem('recentId', data.board.id)
      localStorage.setItem('boardData', JSON.stringify(data.squareData))
      localStorage.setItem('turnCount', turnCount)
      localStorage.setItem('squareCounter', JSON.stringify(squareCounterArr))
      localStorage.setItem('growthArr', JSON.stringify(data.squareGrowth))
      localStorage.setItem('totalCaptured', totalCaptured)
      !radarActive && localStorage.setItem('selectedColor', color)
      localStorage.setItem('dimensions', dimensions)
      localStorage.setItem('hole', hole)
      localStorage.setItem('roundScore', roundScoreValue)
      localStorage.setItem('totalScore', totalScoreValue)
      localStorage.setItem('par', parValue)
      localStorage.setItem('roundNumber', roundNumber)
      localStorage.setItem('playing', 'true')
      localStorage.setItem('fullLogArr', JSON.stringify(fullTurnLogArr))
      localStorage.setItem('gamemode', 'progressive')
  }

  function handleOpen() {
    setIsOpen(!isOpen)
  }

  return (
    <>
    <dialog className='roundDialog'>
        <h2>Round Complete!</h2>
        <h2>You finished this round {roundScore > 0 ? `+${roundScore}` : roundScore} {roundScore <= 0 ? 'under' : 'over'} par!</h2>
        <button onClick={handleReset}>Next Round</button>
    </dialog>
    <dialog className='scoreDialog'>
        <fetcher.Form className='scoreData' reloadDocument method='post'>
            <input type='hidden' name='score' value={totalScore}></input>
            <input type='hidden' name='boardId' value={boardId}></input>
            <input type='hidden' value={boardId} name='boardId'></input>
            <input type='hidden' name='boardSize' value={'18'}></input>
            <input type='hidden' name='turnLog' value={turnLogJSON}></input>
            <input type='hidden' value={user.username} name='username'></input>
            <input type='hidden' value={'submit'} name='submitType'></input>
          </fetcher.Form>
      </dialog>
    <dialog className='endDialog'>
        <fetcher.Form reloadDocument method='post'>
            <h2>Game Over!</h2>
            <h3>You finished {totalScore > 0 ? `+${totalScore}` : totalScore} {totalScore <= 0 ? 'under' : 'over'} par!</h3>
            <input type='hidden' name='score' value={totalScore}></input>
            <input type='hidden' name='boardId' value={boardId}></input>
            <input type='hidden' name='boardSize' value={'18'}></input>
            <input type='hidden' value={user.username} name='username'></input>
            <input type='hidden' value={'newBoard'} name='submitType'></input>
            <button type='submit'>New Board</button>
        </fetcher.Form>
    </dialog>
    <div className='gameContainer'>
      <div className='settingsIcon' onClick={handleOpen}>{isOpen ? 'X' : 'O'}</div>
      <section className='left'>
        <div className='holeInfo'>
          <h1>Hole {holeNumber + 1}</h1>
          <h1>{count} / {par}</h1>
          <h2>Total: {totalScore > 0 ? `+${totalScore}` : totalScore} {totalScore <= 0 ? 'Under' : 'Over'}</h2>
        </div>
        <div className='board' style={{gridTemplateColumns: `repeat(${boardSize}, 1fr)`, background: !radarActive ? selectedColor : 'white'}}>
          {data.squareData[hole].map((sq, index) => {
            return (
              <div className={`square ${data.squareGrowth[hole][index] == false ? '' : data.squareGrowth[hole][index]}`} key={sq.index} style={{background: colorState[index].fakeColor, border: grid ? '1px solid black' : ''}}></div>
            )
          })}
        </div>
        <section className='buttonSection'>
        <div className='extraRow'>
            <div className='resetButton'>
              <fetcher.Form reloadDocument method='post'>
                <input type='hidden' value='newBoard' name='submitType'></input>
                <button type='submit'>New Board</button>
              </fetcher.Form>
            </div>
            {/* <div className={`saveButton ${saveActive === true ? 'active' : ''}`} onClick={handleSave}>
              <h3>Save</h3>
            </div> */}
            <button className={`predictButton ${radarActive == true ? 'active' : ''}`} onClick={handlePredict}>Radar</button>
          </div>
          <div className='colorRow'>
            <div className={`color ${selectedColor === 'var(--red)' ? 'grayed' : ''}`} onClick={() => colorChange('var(--red)')} onMouseEnter={e => radarActive ? colorChange('var(--red)') : e.preventDefault()} style={{ background: 'var(--red)' }}></div>
            <div className={`color ${selectedColor === 'var(--orange)' ? 'grayed' : ''}`} onClick={() => colorChange('var(--orange)')} onMouseEnter={e => radarActive ? colorChange('var(--orange)') : e.preventDefault()} style={{ background: 'var(--orange)' }}></div>
            <div className={`color ${selectedColor === 'var(--yellow)' ? 'grayed' : ''}`} onClick={() => colorChange('var(--yellow)')} onMouseEnter={e => radarActive ? colorChange('var(--yellow)') : e.preventDefault()} style={{ background: 'var(--yellow)' }}></div>
            <div className={`color ${selectedColor === 'var(--green)' ? 'grayed' : ''}`} onClick={() => colorChange('var(--green)')} onMouseEnter={e => radarActive ? colorChange('var(--green)') : e.preventDefault()} style={{ background: 'var(--green)' }}></div>
            <div className={`color ${selectedColor === 'var(--blue)' ? 'grayed' : ''}`} onClick={() => colorChange('var(--blue)')} onMouseEnter={e => radarActive ? colorChange('var(--blue)') : e.preventDefault()} style={{ background: 'var(--blue)' }}></div>
          </div>
        </section>
      </section>
    <section className='right'>
    <div className='scoreboard'>
      <h2>High Score: {highScore != null && highScore}</h2>
      <h3>Squares Remaining</h3>
        <div className='squareRow'>
          <div className='fakeSquare' style={{background: 'var(--red)'}}>
            <h4>{squareCounter[0].count}</h4>
          </div>
          <div className='fakeSquare' style={{background: 'var(--orange)'}}>
            <h4>{squareCounter[1].count}</h4>
          </div>
          <div className='fakeSquare' style={{background: 'var(--yellow)'}}>
            <h4>{squareCounter[2].count}</h4>
          </div>
          <div className='fakeSquare'  style={{background: 'var(--green)'}}>
            <h4>{squareCounter[3].count}</h4>
          </div>
          <div className='fakeSquare'  style={{background: 'var(--blue)'}}>
            <h4>{squareCounter[4].count}</h4>
          </div>
        </div>
      </div>
      <div className={`options ${isOpen ? 'show' : ''}`}>
        <div className='gridView'>
          <h3>Grid View</h3>
          <input id='grid' type='checkbox' value='1px solid black' checked={grid} name='grid' onChange={handleGridToggle}></input>
          <label htmlFor='grid'>Grid</label>
        </div>
        <div className='turnLog'>
          <h3>Turn Log</h3>
          <div className='row'>
                <h3>Turn</h3>
                <h3>Captured</h3>
              </div>
          <div className='turnLogBox'>
            {turnLog && turnLog.map((row, index) => {
              return (
                <div key={index} className='row'>
                <h3>{index + 1}</h3>
                <div className='turnInfo'>
                  <div className='fakeSquare' style={{background: turnLog[index].color}}>
                    <h4>{turnLog[index].captured}</h4>
                  </div>
                </div>
              </div>
              )
            })}
            <div className='anchor'></div>
          </div>
        </div>
        <div className='colorPalette'>
          <div className='colorHolder selectedPalette'>
            <div className='palColor' style={{background: 'var(--red)'}}></div>
            <div className='palColor' style={{background: 'var(--orange)'}}></div>
            <div className='palColor' style={{background: 'var(--yellow)'}}></div>
            <div className='palColor' style={{background: 'var(--green)'}}></div>
            <div className='palColor' style={{background: 'var(--blue)'}}></div>
          </div>
          <div className='colorHolder' onClick={handlePaletteSwap}>
            <div className='palColor' style={{background: 'hsl(0, 100%, 40%)'}}></div>
            <div className='palColor' style={{background: 'hsl(22, 100%, 50%)'}}></div>
            <div className='palColor' style={{background: 'hsl(60, 100%, 50%)'}}></div>
            <div className='palColor' style={{background: 'hsl(130, 100%, 15%)'}}></div>
            <div className='palColor' style={{background: 'hsl(242, 69%, 49%)'}}></div>
          </div>
          <div className='colorHolder' onClick={handlePaletteSwap}>
            <div className='palColor' style={{background: 'hsl(33, 90.8%, 12.7%)'}}></div>
            <div className='palColor' style={{background: 'hsl(33, 89.8%, 26.9%)'}}></div>
            <div className='palColor' style={{background: 'hsl(25, 95.4%, 42.7%)'}}></div>
            <div className='palColor' style={{background: 'hsl(221, 69.2%, 43.3%)'}}></div>
            <div className='palColor' style={{background: 'hsl(213, 68.6%, 90%)'}}></div>
          </div>
          <div className='colorHolder' onClick={handlePaletteSwap}>
            <div className='palColor' style={{background: 'hsl(358,83%,35%)'}}></div>
            <div className='palColor' style={{background: 'hsl(2,72%,51%)'}}></div>
            <div className='palColor' style={{background: 'hsl(211,88%,32%)'}}></div>
            <div className='palColor' style={{background: 'hsl(0,0%,39%)'}}></div>
            <div className='palColor' style={{background: 'hsl(0,0%,14%)'}}></div>
          </div>
          <div className='colorHolder' onClick={handlePaletteSwap}>
            <div className='palColor' style={{background: 'hsl(164,95%,43%)'}}></div>
            <div className='palColor' style={{background: 'hsl(240,100%,98%)'}}></div>
            <div className='palColor' style={{background: 'hsl(43,100%,70%)'}}></div>
            <div className='palColor' style={{background: 'hsl(197,19%,36%)'}}></div>
            <div className='palColor' style={{background: 'hsl(200,43%,7%)'}}></div>
          </div>
          <div className='colorHolder' onClick={handlePaletteSwap}>
            <div className='palColor' style={{background: 'hsl(7,55%,30%)'}}></div>
            <div className='palColor' style={{background: 'hsl(6,56%,49%)'}}></div>
            <div className='palColor' style={{background: 'hsl(24,38%,87%)'}}></div>
            <div className='palColor' style={{background: 'hsl(183,66%,28%)'}}></div>
            <div className='palColor' style={{background: 'hsl(180,20%,20%)'}}></div>
          </div>
          <div className='colorHolder' onClick={handlePaletteSwap}>
            <div className='palColor' style={{background: 'hsl(306, 81%, 21%)'}}></div>
            <div className='palColor' style={{background: 'hsl(327,100%,44%)'}}></div>
            <div className='palColor' style={{background: 'hsl(211,88%,32%)'}}></div>
            <div className='palColor' style={{background: 'hsl(0,0%,39%)'}}></div>
            <div className='palColor' style={{background: 'hsl(0,0%,14%)'}}></div>
          </div>
          <div className='colorHolder' onClick={handlePaletteSwap}>
            <div className='palColor' style={{background: 'hsl(83, 45%, 18%)'}}></div>
            <div className='palColor' style={{background: 'hsl(59,70%,30%)'}}></div>
            <div className='palColor' style={{background: 'hsl(55, 47%, 78%)'}}></div>
            <div className='palColor' style={{background: 'hsl(48,99%,59%)'}}></div>
            <div className='palColor' style={{background: 'hsl(27, 55%, 33%)'}}></div>
          </div>
          <div className='colorHolder' onClick={handlePaletteSwap}>
            <div className='palColor' style={{background: 'hsl(0, 0%, 93%)'}}></div>
            <div className='palColor' style={{background: 'hsl(207, 61%, 30%)'}}></div>
            <div className='palColor' style={{background: 'hsl(15, 97%, 74%)'}}></div>
            <div className='palColor' style={{background: 'hsl(167, 98%, 74%)'}}></div>
            <div className='palColor' style={{background: 'hsl(167, 51%, 46%'}}></div>
          </div>
        </div>
        <div className='link'>
          <Link to='/'>Return to Main Menu</Link>
        </div>
      </div>
    </section>
    </div>
    </>
  )
}

export function links() {
    return [{rel: 'stylesheet', href: gameStyle}]
  }

export default App
