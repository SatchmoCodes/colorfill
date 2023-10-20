import { json, redirect } from "@remix-run/node";
import { Form, Link, NavLink, Outlet, useActionData, useFetcher, useLoaderData } from "@remix-run/react";
import { useSubmit } from "@remix-run/react"


import { useEffect, useState } from 'react'

import { useUser } from "~/utils";
import {prisma} from '~/db.server'
import { requireUserId } from "~/session.server";
import leaderboardstyles from '~/styles/leaderboard.css'
import  { getBestScore, getScoreList, getQueryResult, getUserQueryResult, getAllScores, highScores } from "../models/score.server";
import { getAllUsers, getUserNameById } from "../models/user.server";
import { getPVPUsers, groupPVPGames, groupPVPLosses, groupPVPWins } from "../models/pvpscores.server";



export const loader = async ({ request }) => {
    const userId = await requireUserId(request)
    const url = new URL(request.url)
    const user = await getUserNameById({id: userId})
    console.log(url.searchParams)
    let scoreListItems
    if (url.searchParams == '') {
        scoreListItems = await getQueryResult({ gamemode: 'Free Play', size: 'Medium', order: 'asc' })
    }
    else {
        let size = url.searchParams.get('size')
        let order = 'asc'
        const gamemode = url.searchParams.get('gamemode')
        const username = url.searchParams.get('username')
        if (size == null) {
            size = 'Medium'
        }
        if (gamemode != 'PVP') {
            if (username) {
                scoreListItems = await getUserQueryResult({ username, gamemode, size, order})
            }
            else {
                scoreListItems = await getQueryResult({ gamemode, size, order })
            }
        }
        else {
            const pvpOption = url.searchParams.get('pvpOption')
            scoreListItems = await getQueryResult({ gamemode, size, order })
        }
        
    }

    console.log(user)
    const bestSmallScore = await getBestScore({ userId, size: 'Small', gamemode: 'Free Play'  })
    const bestMediumScore = await getBestScore({ userId, size: 'Medium', gamemode: 'Free Play' })
    const bestLargeScore = await getBestScore({ userId, size: 'Large', gamemode: 'Free Play'  })
    const bestProgScore = await getBestScore({ userId, size: '10', gamemode: 'Progressive'  })
    const pvpPlayerList =  await getPVPUsers()
    const totalScores = await getAllScores({ userId })
    const Wins = await groupPVPWins()
    const Losses = await groupPVPLosses()
    const Games = await groupPVPGames()
    let player
    return json({ totalScores, scoreListItems, bestSmallScore, bestMediumScore, bestLargeScore, bestProgScore, Wins, Losses, Games })
};

// export const action = async ({ request }) => {
//     const userId = await requireUserId(request);
//     const formData = await request.formData()
//     const gamemode = formData.get('gamemode')
//     const size = formData.get('size')
//     console.log(gamemode)
//     console.log(size)
//     const queryListItems = await getQueryResult({ gamemode })
//     // return redirect('/leaderboard')
//     return json({ queryListItems })
// }

const leaderboard = () => {
    const data = useLoaderData()
    const user = useUser()
    const submit = useSubmit()
    console.log(data.Games)
    console.log(data.Wins)

    const [gamemode, setGamemode] = useState('Free Play')
    const [queryData, setQueryData] = useState(data.scoreListItems)
    const [formChanged, setFormChanged] = useState(false)

    function handleRedirect(event) {
        if (event.target.dataset.gamemode == 'Free Play') {
            window.location.href = `/game/${event.target.id}`
        }
        else if (event.target.dataset.gamemode == 'Progressive') {
            window.location.href = `/proggame/${event.target.id}`
        }
    }

    function handleChange(event) {
        console.log(event.currentTarget)
        event.target.name == 'gamemode' && setGamemode(event.target.value)
        setFormChanged(true)
    }

    useEffect(() => {
        submit(document.querySelector('.queryInfo'), {method: 'GET'})
        setFormChanged(false)
    }, [formChanged])

    useEffect(() => {
        setQueryData(data.scoreListItems)
    }, [data])
    
  return (
    <>
        <div className='link'>
          <Link to='/'>Return to Main Menu</Link>
        </div>
        <div className="personalStats">
            <h1>{user.username}</h1>
            <h2>Boards played: {data.totalScores.length}</h2>
            <h2>Best small board score: {data.bestSmallScore == null ? '' : data.bestSmallScore.score}</h2>
            <h2>Best medium board score: {data.bestMediumScore == null ? '' : data.bestMediumScore.score}</h2>
            <h2>Best large board score: {data.bestLargeScore == null ? '' : data.bestLargeScore.score}</h2>
            <h2>Best progressive score: {data.bestProgScore == null ? '' : data.bestProgScore.score}</h2> 
        </div>
        
        <div className="table">
            <div className="topRow">
                <h1>Global Leaderboard</h1>
            </div>
            <div className="row">
                <h2>Rank</h2>
                <h2>User</h2>
                <h2>Gamemode</h2>
                <h2 className="score">Score</h2>
                {gamemode != 'PVP' ? 
                <>
                  <h2>Board Size</h2>
                  <h2>Board Code</h2>
                </> : 
                <>
                  <h2>Win Rate</h2>
                  <h2>Games Played</h2>
                </>
                }
              
            </div>
            <Form className="queryInfo" method='get' onChange={handleChange}>
                <div className="row filters">
                    <div>

                    </div>
                    <div>
                        <input className='username' type="text" name="username"></input>
                    </div>
                    <div>
                        <select className="gamemode" name="gamemode">
                            <option value='Free Play'>Free Play</option>
                            <option value='Progressive'>Progressive</option>
                            <option value='PVP'>Player Vs Player</option>
                        </select>
                    </div>
                    <div className="score">

                    </div>
                    <div>
                        {gamemode == 'Free Play' && <select className="size" name="size" defaultValue={'Medium'}>
                            <option>Small</option>
                            <option >Medium</option>
                            <option>Large</option>
                        </select>}
                        {gamemode == 'Progressive' && <select className="size" name="size" defaultValue={'10'}>
                            <option >10</option>
                        </select>}
                        {gamemode == 'PVP' && <select className="pvpOption" name="pvpOption" defaultValue={'winRate'}>
                            <option>Win Rate</option>
                            <option >Games Played</option>
                        </select>}
                    </div>
                    <div>

                    </div>
                </div>
            </Form>
            <>
            {queryData.length == 0 ? <div className="row empty"><h2>No results found</h2></div> : queryData.map((score, index) => (
                <div className="row" key={score.id}>
                    <h2>{index + 1}</h2>
                    <h2>{score.userName}</h2>
                    <h2>{score.gamemode}</h2>
                    <h2 className="score">{score.gamemode == 'Progressive' && score.score > 0 ? '+' + score.score : score.score}</h2>
                    <h2>{score.boardSize}</h2>
                    <h2 className='playBoard' id={score.boardId} data-gamemode={score.gamemode} onClick={(event) => handleRedirect(event)}>Play this board</h2>
                </div>
            ))}
            </>
         
        </div>
        
    </>
  )
}

export default leaderboard

export function links() {
    return [{rel: 'stylesheet', href: leaderboardstyles}]
  }