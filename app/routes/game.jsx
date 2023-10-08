import { useState } from 'react'
import { useEffect } from 'react'
import { json, redirect } from "@remix-run/node";
import gameStyle from '~/styles/game.css'
import generateBoard from './SquareGenerator'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { library } from '@fortawesome/fontawesome-svg-core'
import { Link, useNavigation } from "@remix-run/react";
import { faCheckSquare, faCoffee, faGear } from '@fortawesome/free-solid-svg-icons'

library.add(faCheckSquare, faCoffee, faGear)

import { useUser } from "~/utils";
import { requireUserId } from "~/session.server";
import { Form, useActionData, useLoaderData} from '@remix-run/react'
import { createBoard} from '~/models/board.server'
import { createScore} from '~/models/score.server'
import { getBoard } from '~/models/board.server'
import invariant from "tiny-invariant";

import { useFetcher } from "@remix-run/react";
import { getBestScore, getBestBoardScore } from '../models/score.server';


export const loader = async ({ params, request }) => {
  const userId = await requireUserId(request);
  invariant(params.boardId, "boardId not found");

  const board = await getBoard({ id: params.boardId });
  if (!board) {
    throw new Response("Not Found", { status: 404 });
  }
  let squareData = generateBoard(board.boardData).flat()
  let squareGrowth = new Array(board.boardData.length).fill(false)
  let bestScore = await getBestScore({ userId, gamemode: 'Free Play', size: board.size})
  const bestGlobalScore = await getBestBoardScore({ boardId: board.id})
  if (bestGlobalScore) {
    return json({ board, squareData, squareGrowth, bestScore, bestGlobalScore })
  }
  else {
    return json({ board, squareData, squareGrowth, bestScore });
  }
};


export const action = async ({ request }) => {
  const userId = await requireUserId(request)
  const formData = await request.formData()
  const submitType = formData.get('submitType')
  let newBoardSize = formData.get('newBoardSize')
  const userName = formData.get('username')
  const gamemode = 'Free Play'
  let boardData = ''

  for (let i = 0; i < newBoardSize * newBoardSize; i++) {
    boardData+= Math.floor(Math.random() * 5)
  }

  switch(newBoardSize) {
    case '10':
      newBoardSize = 'Small'
      break;
    case '15':
      newBoardSize = 'Medium'
      break;
    case '20':
      newBoardSize = 'Large'
      break;
  }

  if (submitType == 'submit') {
    let score = formData.get('score')
    const boardId = formData.get('boardId')
    const turnLog = formData.get('turnLog')
    let boardSize = formData.get('boardSize')
    score = parseInt(score)
    switch(boardSize) {
      case '10':
        boardSize = 'Small'
        break;
      case '15':
        boardSize = 'Medium'
        break;
      case '20':
        boardSize = 'Large'
        break;
    }
    const newScore = await createScore({ score, gamemode, turnlog: turnLog, userId, boardId, boardSize, userName })
  }

  if (submitType == 'newBoard') {
    const newBoard = await createBoard({ size: newBoardSize, boardData, userId})
    return redirect(`/game/${newBoard.id}`)
  }
  return null
}

const colors = ['var(--red)', 'var(--orange)', 'var(--yellow)', 'var(--green)', 'var(--blue)']
const paletteColors = ['--red', '--orange', '--yellow', '--green', '--blue']
let totalCaptured = 0
let turnCount = 0
// let boardSize = 20
// let totalDim = 400

// let data.squareData = generateBoard(boardSize).flat()
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


// let data.squareGrowth = new Array(totalDim).fill(false)



let tempSquareArr
let turnLogArr = []
let turnLogJSON
let numberCaptured = 0
let hasRun = false

function App() {
  const user = useUser()
  const fetcher = useFetcher()
  const data = useLoaderData()
  const navigation = useNavigation()

  const isSubmitting = navigation.formAction === '/game'


  const [count, setCount] = useState(turnCount) //track # of turns
  const [colorState, setColorState] = useState(data.squareData) //tracks color of entire board
  const [squareCounter, setSquareCounter] = useState(squareCounterArr) //sets number of squares left
  const [highScore, setHighScore] = useState(data.bestScore == null ? '' : data.bestScore.score)
  const [selectedColor, setSelectedColor] = useState(data.squareData[0].color) //sets selected color at bottom
  const [saveActive, setSaveActive] = useState(false)
  const [radarActive, setRadarActive] = useState(false)
  const [growth, setGrowth] = useState(data.squareGrowth) //class animation on capture
  const [customBoardSize, setCustomBoardSize] = useState('')
  const [boardSize, setBoardSize] = useState(Math.sqrt(data.board.boardData.length))
  const [newBoardSize, setNewBoardSize] = useState(Math.sqrt(data.board.boardData.length))
  const [grid, setGrid] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const [complete, setComplete] = useState(false)

  const [turnLog, setTurnLog] = useState(turnLogArr)
  const [oppTurnLog, setOppTurnLog] = useState(null)

  const [boardId, setBoardId] = useState(data.board.id)

  useEffect(() => {
    if (!hasRun) {
      if (localStorage.getItem('recentId') == data.board.id && localStorage.getItem('playing') == 'true') {
          tempSquareArr = JSON.parse(localStorage.getItem('boardData'))
          setGrowth(JSON.parse(localStorage.getItem('growthArr')))
          turnCount = localStorage.getItem('turnCount')
          totalCaptured = localStorage.getItem('totalCaptured')
          squareCounterArr = JSON.parse(localStorage.getItem('squareCounter'))
          turnLogArr = JSON.parse(localStorage.getItem('turnLog'))
          setSelectedColor(localStorage.getItem('selectedColor'))
          setSquareCounter(squareCounterArr)
          setCount(turnCount)
          setTurnLog(turnLogArr)
      }
      else {
        
        tempSquareArr = JSON.parse(JSON.stringify(data.squareData))
        tempSquareArr.forEach(sq => {
          // boardCode += (colors.indexOf(sq.color))
          squareCounterArr.forEach(counter => {
              if (sq.color == counter.color && !sq.index == 0) {
                counter.count++
              }
            })
        })
      }
    data.squareGrowth[0] = 'captured'
    setGrowth(data.squareGrowth)
    setSquareCounter(squareCounterArr)
    console.log(tempSquareArr)
    tempSquareArr.forEach((sq, index) => {
      if (sq.captured) {
        captureCheck(sq.color, index);
      }
    });
    data.squareData = JSON.parse(JSON.stringify(tempSquareArr))
    setColorState(tempSquareArr)
    localStorage.getItem('grid') == 'true' && setGrid(true)
    hasRun = true
    }
    if (data.bestGlobalScore) {
      console.log(data.bestGlobalScore.turnlog)
      setOppTurnLog(JSON.parse(data.bestGlobalScore.turnlog))
    }
    for (let i = 0; i < 5; i++) {
      if (localStorage.getItem(paletteColors[i])) {
        document.documentElement.style.setProperty(paletteColors[i], localStorage.getItem(paletteColors[i]))
      } 
    }
    
  }, []);

  useEffect(() => {
    if (data.bestGlobalScore) {
      console.log(JSON.parse(data.bestGlobalScore.turnlog))
      setOppTurnLog(JSON.parse(data.bestGlobalScore.turnlog))
    }
  }, [data.bestGlobalScore])


  function colorChange(color) {
    tempSquareArr = JSON.parse(JSON.stringify(data.squareData))
    let numberCaptured = totalCaptured
    console.log(localStorage.getItem('playing'))
    setColorState(tempSquareArr)
    data.squareGrowth.map((e, index) => {
      if (e == 'predicted') {
        data.squareGrowth[index] = false
      }
    })
    setGrowth(data.squareGrowth)
    !radarActive && turnCount++
    !radarActive && setSelectedColor(color)
    console.log(turnCount)
      tempSquareArr.forEach((sq, index) => {
        if (sq.captured) {
          captureCheck(color, index)
        }
      })
    setColorState(tempSquareArr)
    setCount(turnCount)
    if (radarActive) {
      tempSquareArr = JSON.parse(JSON.stringify(data.squareData))
    } 
    data.squareData = JSON.parse(JSON.stringify(tempSquareArr))
    if (!radarActive) {
      numberCaptured = totalCaptured - numberCaptured
      let captureObj = {
        captured: numberCaptured,
        color: color
      }
      turnLogArr.push(captureObj)
      let newArrayCauseReactIsLame = [...turnLogArr]
      setTurnLog(newArrayCauseReactIsLame)
    }
    //saving board status to local storage if user quits early
    if (turnCount >= 1) {
      console.log('new board saved')
      localStorage.setItem('recentId', data.board.id)
      localStorage.setItem('boardData', JSON.stringify(data.squareData))
      localStorage.setItem('turnCount', turnCount)
      localStorage.setItem('squareCounter', JSON.stringify(squareCounterArr))
      localStorage.setItem('growthArr', JSON.stringify(data.squareGrowth))
      localStorage.setItem('totalCaptured', totalCaptured)
      localStorage.setItem('playing', 'true')
      localStorage.setItem('gamemode', 'freeplay')
      !radarActive && localStorage.setItem('selectedColor', color)
      localStorage.setItem('turnLog', JSON.stringify(turnLogArr))
    }

    if (totalCaptured >= (boardSize * boardSize) - 1) {
      setComplete(true)
      let turnLogObj = new Object()
      turnLogObj.turnLog = turnLogArr
      turnLogJSON = JSON.stringify(turnLogObj)
      localStorage.setItem('playing', 'false')
      if (turnCount < highScore || highScore == null) {
        setHighScore(turnCount)
      }
    }
  }

  useEffect(() => {
    let x = document.querySelectorAll('.row')
    document.querySelectorAll('.row') != null && document.querySelectorAll('.row')[x.length - 1].scrollIntoView({ behavior: "smooth", block: "end", inline: "nearest" });
  }, [turnLog])

  useEffect(() => {
    if (complete) {
      fetcher.submit(document.querySelector('.scoreData'))
      document.querySelector('.endDialog').show()
    }
  }, [complete])

  function updateSquareCount(color) {
    squareCounterArr.forEach(sq => {
      if (sq.color == color) {
        sq.count--
      }
    })
    setSquareCounter(squareCounterArr)
  }

  function captureCheck(color, index) {
    !radarActive ? tempSquareArr[index].fakeColor = color :   tempSquareArr[index].fakeColor = data.squareData[index].fakeColor
    tempSquareArr[index].color = color
    // right
    if (tempSquareArr[index + 1] && tempSquareArr[index + 1].captured == false) {
      if (tempSquareArr[index].color == tempSquareArr[index + 1].color && tempSquareArr[index].rowIndex == tempSquareArr[index + 1].rowIndex) {
        tempSquareArr[index + 1].color = color
        tempSquareArr[index + 1].captured = true
        !radarActive && updateSquareCount(color)
        !radarActive && totalCaptured++
        !radarActive ? data.squareGrowth[index + 1] = 'captured' : data.squareGrowth[index + 1] = 'predicted'
        setGrowth(data.squareGrowth)
        tempSquareArr[index + 1].colIndex <= boardSize && captureCheck(color, index + 1)
      }
    }
    //left
    if (tempSquareArr[index - 1] && tempSquareArr[index - 1].captured == false) {
      if (tempSquareArr[index].color == tempSquareArr[index - 1].color && tempSquareArr[index].rowIndex == tempSquareArr[index - 1].rowIndex) {
        tempSquareArr[index - 1].color = color
        tempSquareArr[index - 1].captured = true
        !radarActive && updateSquareCount(color)
        !radarActive && totalCaptured++
        !radarActive ? data.squareGrowth[index - 1] = 'captured' : data.squareGrowth[index - 1] = 'predicted'
        setGrowth(data.squareGrowth)
        tempSquareArr[index - 1].colIndex <= boardSize && captureCheck(color, index - 1)
      }
    }
    // // // // down
    if (tempSquareArr[index + boardSize] && tempSquareArr[index + boardSize].captured == false) {
      if (tempSquareArr[index].color == tempSquareArr[index + boardSize].color) {
        tempSquareArr[index + boardSize].color = color
        tempSquareArr[index + boardSize].captured = true
        !radarActive && updateSquareCount(color)
        !radarActive && totalCaptured++
        !radarActive ? data.squareGrowth[index + boardSize] = 'captured' : data.squareGrowth[index + boardSize] = 'predicted'
        setGrowth(data.squareGrowth)
        tempSquareArr[index + boardSize].rowIndex <= boardSize && captureCheck(color, index + boardSize)
      }
    }
    // // //up
    if (tempSquareArr[index - boardSize] && tempSquareArr[index - boardSize].captured == false) {
      if (tempSquareArr[index].color == tempSquareArr[index - boardSize].color) {
        tempSquareArr[index - boardSize].color = color
        tempSquareArr[index - boardSize].captured = true
        !radarActive && updateSquareCount(color)
        !radarActive && totalCaptured++
        !radarActive ? data.squareGrowth[index - boardSize] = 'captured' : data.squareGrowth[index - boardSize] = 'predicted'
        setGrowth(data.squareGrowth)
        tempSquareArr[index - boardSize].rowIndex <= boardSize && captureCheck(color, index - boardSize)
      }
    }
  }


  function handleRetry() {
    console.log('hi')
    turnCount = 0
    tempSquareArr.forEach(sq => {
      sq.color = sq.defaultColor
      sq.fakeColor = sq.defaultColor
      sq.captured = false
    })
    tempSquareArr[0].captured = true
    
   data.squareGrowth.forEach((e, index) => {
    data.squareGrowth[index] = false
   })
    setGrowth(data.squareGrowth)
    setColorState(tempSquareArr)
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
        captureCheck(sq.color, index);
      }
    });
    setColorState(tempSquareArr)
    setSelectedColor(tempSquareArr[0].color)
    data.squareData = JSON.parse(JSON.stringify(tempSquareArr))
    setComplete(false)
    turnLogArr = []
    setTurnLog(turnLogArr)
    document.querySelector('.endDialog').close()
  }

  function handleSave() {
    setSaveActive(!saveActive)
  }

  function handlePredict() {
    setRadarActive(!radarActive)
    // setColorState(tempSquareArr)
    data.squareGrowth.map((e, index) => {
      if (e == 'predicted') {
        data.squareGrowth[index] = false
      }
    })
    setGrowth(data.squareGrowth)
  }

  function handleSizeChange(event) {
    // console.log(customBoardSize)
    // if (customBoardSize >= 5 && customBoardSize <= 40) {
    //   boardSize = parseInt(customBoardSize)
    //   totalDim = parseInt(customBoardSize * customBoardSize)
    //   sizeString = 'Custom'
    // }
    // else {
    //   boardSize = parseInt(event.target.value)
    //   totalDim = parseInt(event.target.value * event.target.value)
    //   handleReset()
    // }
    setNewBoardSize(event.target.value)
  }

  const handleCustomBoardSize = (event) => {
    if (event.target.value == '') {
      setCustomBoardSize('')
    }
    else {
      let x = parseInt(event.target.value)
      setCustomBoardSize(x)
    }
  }

  const handleGridToggle = (event) => {
    !grid ? localStorage.setItem('grid', 'true') : localStorage.setItem('grid', 'false')
    setGrid(!grid)
  }

  function handlePaletteSwap(event) {
    // document.querySelectorAll('.colorHolder').forEach(e => {
    //   e.classList.remove('selected')
    // })
    // event.currentTarget.classList.add('selected')
    const colors = ['--red', '--orange', '--yellow', '--green', '--blue', '--owner', '--opponent']
    // for (let i = 0; i < 5; i++) {
    //   document.documentElement.style.setProperty(colors[i], `${event.target.parentElement.querySelectorAll('.palColor')[i].style.background}`);
    // }
    for (let i = 0; i < colors.length; i++) {
      localStorage.setItem(colors[i], event.target.parentElement.querySelectorAll('.palColor')[i].style.background)
      document.documentElement.style.setProperty(colors[i], `${event.target.parentElement.querySelectorAll('.palColor')[i].style.background}`)
    }
  }

  function handleOpen() {
    setIsOpen(!isOpen)
  }

  useEffect(() => {
    let x = document.querySelectorAll('.row')
    x != null && document.querySelectorAll('.row')[x.length - 1].scrollIntoView({ behavior: "smooth", block: "end", inline: "nearest" });
  }, [isOpen])


  return (
    <div className='gameContainer'>
      <div className='settingsIcon' onClick={handleOpen}>{isOpen ? 'X' : 'O'}</div>
      <dialog className='scoreDialog'>
        <fetcher.Form className='scoreData' method='post'>
            <input type='hidden' value={turnCount} name='score'></input>
            <input type='hidden' value={boardSize} name='boardSize'></input>
            <input type='hidden' value={boardId} name='boardId'></input>
            <input type='hidden' value={newBoardSize} name='newBoardSize'></input>
            <input type='hidden' value={turnLogJSON} name='turnLog'></input>
            <input type='hidden' value={user.username} name='username'></input>
            <input type='hidden' value={'submit'} name='submitType'></input>
          </fetcher.Form>
      </dialog>
      <dialog className='endDialog'>
        <fetcher.Form className='formData' reloadDocument method='post' action='/game'>
          {fetcher.state === 'submitting' ? 
          <div>
            <h2>Submitting data</h2>
          </div> : 
          <div>
            <h2>You completed the board in {count} turns!</h2>
            <input type='hidden' value={newBoardSize} name='newBoardSize'></input>
            <input type='hidden' value={'newBoard'} name='submitType'></input>
            <button type='submit'>New Board</button>
          </div>}
        </fetcher.Form>
        {fetcher.state !== 'submitting' && <button type='submit' onClick={handleRetry}>Retry</button>}
      </dialog>
    <section className={`left ${isOpen ? 'hide' : ''}`}>
      <h1>{data.bestGlobalScore ? `${count} / ${data.bestGlobalScore.score}` : count}</h1>
      <div className='board' style={{gridTemplateColumns: `repeat(${boardSize}, 1fr)`, background: !radarActive ? selectedColor : 'white'}}>
        {data.squareData.map((sq, index) => {
          return (
            <div className={`square ${data.squareGrowth[index] == false ? '' : data.squareGrowth[index]}`} key={sq.index} style={{background: colorState[index].fakeColor, border: grid ? '1px solid black' : ''}}></div>
          )
        })}
      </div>
      <section className='buttonSection'>
        <div className='extraRow'>
          <div className='resetButton'>
            <fetcher.Form reloadDocument method='post' action='/game'>
              <input type='hidden' value='newBoard' name='submitType'></input>
              <input type='hidden' value={newBoardSize} name='newBoardSize'></input>
              <button type='submit'>New Board</button>
            </fetcher.Form>
          </div>
          {/* <div className={`saveButton ${saveActive === true ? 'active' : ''}`} onClick={handleSave}>
            <h3>Save</h3>
          </div> */}
          <button className='retryButton' onClick={handleRetry}>Retry Board</button>
          <button className={`predictButton ${radarActive == true ? 'active' : ''}`} onClick={handlePredict}>Radar</button>
        </div>
        <div className='colorRow'>
          <div className={`color ${selectedColor === 'var(--red)' ? 'grayed' : ''}`} onClick={!complete ? () => colorChange('var(--red)') : ''} onMouseEnter={e => radarActive ? colorChange('var(--red)') : e.preventDefault()} style={{ background: 'var(--red)' }}></div>
          <div className={`color ${selectedColor === 'var(--orange)' ? 'grayed' : ''}`} onClick={!complete ? () => colorChange('var(--orange)') : ''} onMouseEnter={e => radarActive ? colorChange('var(--orange)') : e.preventDefault()} style={{ background: 'var(--orange)' }}></div>
          <div className={`color ${selectedColor === 'var(--yellow)' ? 'grayed' : ''}`} onClick={!complete ? () => colorChange('var(--yellow)') : ''} onMouseEnter={e => radarActive ? colorChange('var(--yellow)') : e.preventDefault()} style={{ background: 'var(--yellow)' }}></div>
          <div className={`color ${selectedColor === 'var(--green)' ? 'grayed' : ''}`} onClick={!complete ? () => colorChange('var(--green)') : ''} onMouseEnter={e => radarActive ? colorChange('var(--green)') : e.preventDefault()} style={{ background: 'var(--green)' }}></div>
          <div className={`color ${selectedColor === 'var(--blue)' ? 'grayed' : ''}`} onClick={!complete ? () => colorChange('var(--blue)') : ''} onMouseEnter={e => radarActive ? colorChange('var(--blue)') : e.preventDefault()} style={{ background: 'var(--blue)' }}></div>
        </div>
      </section>
    </section>
    <section className='right'>
      <div className='scoreboard'>
      <h2>{data.bestGlobalScore ? `Score to Beat: ${data.bestGlobalScore.score}` : `High Score: ${highScore}`}</h2>
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
        <div className='optionWrap'>
          <div className='boardSize'>
            <h2>Board Size</h2>
            <div className='boardOptions'>
              <div className='option'>
                <input id='small' type='radio' name='size' checked={newBoardSize == '10'} value={10} onChange={handleSizeChange}/>
                <label htmlFor='small'>Small</label>
              </div>
              <div className='option'>
                <input id='medium' type='radio' name='size' checked={newBoardSize == '15'} value={15} onChange={handleSizeChange}/>
                <label htmlFor='medium'>Medium</label>
              </div>
              <div className='option'>
                <input id='large' type='radio' name='size' checked={newBoardSize == '20'} value={20} onChange={handleSizeChange}/>
                <label htmlFor='large'>Large</label>
              </div>
              {/* <div className='customOption'>
                <label htmlFor='customInput'>Custom</label>
                <input id='customInput' type='text' name='size' value={customBoardSize} placeholder='5-40' onChange={handleCustomBoardSize}/>
              </div> */}
            </div>
          </div>
          <div className='gridView'>
            <h2>Grid View</h2>
            <input id='grid' type='checkbox' value='1px solid black' checked={grid} name='grid' onChange={handleGridToggle}></input>
            <label htmlFor='grid'>Grid</label>
          </div>
        </div>
        <div className='turnLog'>
          <h3>Turn Log</h3>
          <div className='row'>
              <h3>Turn</h3>
              <h3>Captured</h3>
          </div>
          {data.bestGlobalScore && <div className='row'>
              <h3></h3>
              <h3>You</h3>
              <h3>{data.bestGlobalScore.userName}</h3>
          </div>}
          <div className='turnLogBox'>
            {turnLog && turnLog.map((row, index) => {
              return (
                <div className='row'>
                <h3>{index + 1}</h3>
                <div className='turnInfo'>
                  <div className='fakeSquare' style={{background: turnLog[index].color}}>
                    <h4>{turnLog[index].captured}</h4>
                  </div>
                </div>
                {oppTurnLog != null && <div className='turnInfo'>
                  <div className='fakeSquare' style={oppTurnLog.turnLog[index] && {background: oppTurnLog.turnLog[index].color}}>
                    <h4>{oppTurnLog.turnLog[index] && oppTurnLog.turnLog[index].captured}</h4>
                  </div>
                  {/* <div className='fakeSquare' style={data.bestGlobalScore && {background: JSON.parse(data.bestGlobalScore.turnlog.turnLog[index]).color}}>
                    <h4>{data.bestGlobalScore && JSON.parse(data.bestGlobalScore.turnlog.turnLog[index]).captured}</h4>
                  </div> */}
                </div>}
              </div>
              )
            })}
            <div className='anchor'></div>
          </div>
        </div>
        <h2 className='colorOptions'>Color Options</h2>
        <div className='colorPalette'>
          <div className='colorHolder selectedPalette'>
            <div className='palColor' style={{background: 'var(--red)'}}></div>
            <div className='palColor' style={{background: 'var(--orange)'}}></div>
            <div className='palColor' style={{background: 'var(--yellow)'}}></div>
            <div className='palColor' style={{background: 'var(--green)'}}></div>
            <div className='palColor' style={{background: 'var(--blue)'}}>
            <div className='palColor hide' style={{background: 'white'}}></div>
            <div className='palColor hide' style={{background: 'black'}}></div>
          </div>
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
        </div>
        <div className='link'>
          <Link to='/'>Return to Main Menu</Link>
        </div>
      </div>
    </section>
    </div>
  )
}

export function links() {
    return [{rel: 'stylesheet', href: gameStyle}]
  }

export default App
