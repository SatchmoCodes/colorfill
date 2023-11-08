import { json, redirect } from "@remix-run/node";
import { Form, Link, NavLink, Outlet, useActionData, useFetcher, useLoaderData, useNavigation } from "@remix-run/react";
import { useSubmit } from "@remix-run/react"
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { library } from '@fortawesome/fontawesome-svg-core'
import { faPlay} from '@fortawesome/free-solid-svg-icons'
library.add(faPlay)

import { useEffect, useState } from 'react'

import { useUser } from "~/utils";
import {prisma} from '~/db.server'
import { requireUserId } from "~/session.server";
import leaderboardstyles from '~/styles/leaderboard.css'
import  { getBestScore, getScoreList, getQueryResult, getUserQueryResult, getAllScores, highScores } from "../models/score.server";
import { getAllUserGames, getAllUsers, getUserById, getUserNameById, getUserStats, getSearchGames } from "../models/user.server";
import { countPVPWins, getPVPUsers, groupPVPGames, groupPVPLosses, groupPVPWins } from "../models/pvpscores.server";

import { Audio } from "react-loader-spinner";
import { useHydrated } from "remix-utils";



export const loader = async ({ request }) => {
    const userId = await requireUserId(request)
    const url = new URL(request.url)
    const user = await getUserNameById({id: userId})
    const gamemode = url.searchParams.get('gamemode')
    const username = url.searchParams.get('username')
    console.log(url.searchParams)
    let scoreListItems
    if (url.searchParams == '') {
        scoreListItems = await getQueryResult({ gamemode: 'Free Play', size: 'Medium', order: 'asc' })
    }
    else {
        let size = url.searchParams.get('size')
        let order = 'asc'
        if (size == null) {
            size = 'Medium'
        }
        if (gamemode != 'PVP') {
            scoreListItems = await getQueryResult({ gamemode, size, order })
            // if (username) {
            //     scoreListItems = await getUserQueryResult({ username, gamemode, size, order})
            // }
            // else {
            //     scoreListItems = await getQueryResult({ gamemode, size, order })
            // }
        }
        else {
            scoreListItems = await getAllUserGames()
            // if (username) {
            //     scoreListItems = await getSearchGames({ username })
            // }
            // else {
            //     scoreListItems = await getAllUserGames()
            // }
        }
        
    }

    const bestSmallScore = await getBestScore({ userId, size: 'Small', gamemode: 'Free Play'  })
    const bestMediumScore = await getBestScore({ userId, size: 'Medium', gamemode: 'Free Play' })
    const bestLargeScore = await getBestScore({ userId, size: 'Large', gamemode: 'Free Play'  })
    const bestProgScore = await getBestScore({ userId, size: '10', gamemode: 'Progressive'  })
    const totalScores = await getAllScores({ userId })
    console.log('balls')
    console.log(userId)
    const pvpInfo = await getUserStats({ id: userId})
    let personalWinRate = (pvpInfo.wins / (pvpInfo.wins + pvpInfo.losses))
    pvpInfo.winRate = Math.round((personalWinRate + Number.EPSILON) * 100)

    // const allGames = await getAllUserGames()
    if (gamemode == 'PVP') {
        const pvpOption = url.searchParams.get('pvpOption')
        scoreListItems.forEach((game) => {
            game.winRate = game.wins / (game.wins + game.losses)
            scoreListItems.filter((a) => a.wins + a.losses > 4)
            game.winRate = Math.round((game.winRate + Number.EPSILON) * 100)
        })
        if (pvpOption == 'Win Rate') {
            scoreListItems.sort((a, b) => a.winRate - b.winRate)
            scoreListItems = scoreListItems.filter((a) => a.wins + a.losses > 4)
            scoreListItems.reverse()
        }
        else if (pvpOption == 'Games Played') {
            scoreListItems.sort((a, b) => (a.wins + a.losses) - (b.wins + b.losses))
            scoreListItems = scoreListItems.filter((a) => a.wins + a.losses > 4)
            scoreListItems.reverse()
        }
        else if (pvpOption == 'Win Streak') {
            scoreListItems.sort((a, b) => a.winStreak - b.winStreak)
            scoreListItems = scoreListItems.filter((a) => a.wins + a.losses > 4)
            scoreListItems.reverse()
        }
    }

    if (username) {
        let lowerUsername = username.toLowerCase()
        scoreListItems.forEach((score, index) => {
            score.rank = index + 1
        })
        if (gamemode != 'PVP') {
            scoreListItems = scoreListItems.filter((score) => score.userName.toLowerCase().startsWith(lowerUsername))
        }
        else {
            scoreListItems = scoreListItems.filter((score) => score.username.toLowerCase().startsWith(lowerUsername))
        }
    }
   
    return json({ totalScores, scoreListItems, bestSmallScore, bestMediumScore, bestLargeScore, bestProgScore, pvpInfo })
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
    const navigation = useNavigation()
    const isHydrated = useHydrated()

    const [gamemode, setGamemode] = useState('Free Play')
    const [queryData, setQueryData] = useState(data.scoreListItems)
    const [formChanged, setFormChanged] = useState(false)
    // const [sortOption, setSortOption] = useState('Win Rate')
    const [width, setWidth] = useState(0)

    useEffect(() => {
        setWidth(window.innerWidth)
        console.log(window.history)
    }, [])

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

    function handleWindowSizeChange() {
        setWidth(window.innerWidth)
        console.log(window.innerWidth)
    }

    useEffect(() => {
        window.addEventListener('resize', handleWindowSizeChange);
        return () => {
            window.removeEventListener('resize', handleWindowSizeChange);
        }
    }, []);
    

    useEffect(() => {
        submit(document.querySelector('.queryInfo'), {method: 'GET'})
        setFormChanged(false)
    }, [formChanged])

    useEffect(() => {
        setQueryData(data.scoreListItems)
    }, [data])

    console.log(data.scoreListItems)
    
  return (
    <>
        <div className='link'>
          <Link to='/'>Return to Main Menu</Link>
        </div>
        <div className="personalStats">
            <h1>{user.username}</h1>
            <h2>Boards Played: {data.totalScores.length}</h2>
            <h2>Best Small Board Score: {data.bestSmallScore == null ? '' : data.bestSmallScore.score}</h2>
            <h2>Best Medium Board Score: {data.bestMediumScore == null ? '' : data.bestMediumScore.score}</h2>
            <h2>Best Large Board Score: {data.bestLargeScore == null ? '' : data.bestLargeScore.score}</h2>
            <h2>Best Progressive Score: {data.bestProgScore == null ? '' : data.bestProgScore.score}</h2>
            <h2>PVP Win Rate: {data.pvpInfo.wins + data.pvpInfo.losses == 0 ? '' : data.pvpInfo.winRate + '%'}</h2>
            <h2>PVP Games Played: {data.pvpInfo.wins + data.pvpInfo.losses == 0 ? '' : `${data.pvpInfo.wins + data.pvpInfo.losses} ${data.pvpInfo.wins + data.pvpInfo.losses == 1 ? 'Game' : 'Games'}`}</h2>
            <h2>PVP Best Win Streak: {data.pvpInfo.bestWinStreak == 0 ? '' : `${data.pvpInfo.bestWinStreak} ${data.pvpInfo.bestWinStreak == 1 ? 'Game' : 'Games'}`} </h2>
        </div>
        
        {isHydrated && <div className="table">
            <div className="interior">
            {navigation.state == 'loading' && <Audio height="80" width="80"radius="9"color="green"ariaLabel="loading" wrapperStyle wrapperClass='loadingData'></Audio>}
            {navigation.state == 'loading' && <div></div>}
            <div className="topRow">
                <h1>Global Leaderboard</h1>
            </div>
            <div className="row categories">
                <h2>Rank</h2>
                <h2 className="user">User</h2>
                <h2 className="gmode">Gamemode</h2>
                {gamemode != 'PVP' ? 
                <h2 className="score">Score</h2> :
                <h2 className="sort">Sort By</h2>}
                {gamemode != 'PVP' ? 
                <>
                  <h2 className="size">Board Size</h2>
                  <h2 className="playBoard">Board Link</h2>
                </> : 
                <>
                  <h2 className="pvpCol">Win Rate</h2>
                  <h2 className="pvpCol">Games Played</h2>
                </>
                }
                {gamemode == 'PVP' && <h2 className="pvpCol">Win Streak</h2>}
            </div>
            <Form className="queryInfo" method='get' onChange={handleChange}>
                <div className="row filters">
                    <div className="rank">

                    </div>
                    <div className="user">
                        <input className='username' type="text" name="username"></input>
                    </div>
                    <div className="gmode">
                        <select className="gamemode" name="gamemode">
                            <option value='Free Play'>Free Play</option>
                            <option value='Progressive'>Progressive</option>
                            <option value='PVP'>Player Vs Player</option>
                        </select>
                    </div>
                    {gamemode != 'PVP' ? 
                    <div className="score">

                    </div> : 
                    <div className="sort">
                        <select className="pvpOption" name="pvpOption" defaultValue={'winRate'}>
                            <option>Win Rate</option>
                            <option >Games Played</option>
                            <option>Win Streak</option>
                        </select>
                    </div>}
                    
                    <div className={gamemode != 'PVP' ? 'size' : 'pvpCol'}>
                        {gamemode == 'Free Play' && <select name="size" defaultValue={'Medium'}>
                            <option>Small</option>
                            <option >Medium</option>
                            <option>Large</option>
                        </select>}
                        {gamemode == 'Progressive' && <select className="size" name="size" defaultValue={'10'}>
                            <option >10</option>
                        </select>}
                    </div>
                    <div className={gamemode != 'PVP' ? 'playBoard' : 'pvpCol'}>

                    </div>
                    {gamemode == 'PVP' && <div className="pvpCol"></div>}
                </div>
            </Form>
            <>
            {queryData.length == 0 ? <div className="row empty"><h2>No results found</h2></div> : queryData.map((score, index) => (
                <div className="row" key={score.id}>
                    {gamemode != 'PVP' ? 
                    <>
                        <h2>{score.rank != null ? score.rank : index + 1}</h2>
                        <h2 className="user">{score.userName}</h2>
                        <h2 className="gmode">{score.gamemode}</h2>
                        <h2 className="score">{score.gamemode == 'Progressive' && score.score > 0 ? '+' + score.score : score.score}</h2>
                        <h2 className="size">{score.boardSize}</h2>
                        {isHydrated && <h2 className="playBoard" onClick={(event) => handleRedirect(event)}><FontAwesomeIcon className='play' icon="fa-solid fa-play" id={score.boardId} data-gamemode={score.gamemode}/></h2>}
                    </> : 
                    <>
                        <h2>{score.rank != null ? score.rank : index + 1}</h2>
                        <h2 className="user">{score.username}</h2>
                        <h2 className="gmode">Player vs Player</h2>
                        <h2 className="sort"></h2>
                        <h2 className="pvpCol">{score.winRate}%</h2>
                        <h2 className="pvpCol">{score.wins + score.losses}</h2>
                        <h2 className="pvpCol">{score.winStreak}</h2>
                    </>}
                </div>
            ))}
            </>
            </div>
        </div>}
        
    </>
  )
}

export default leaderboard

export function links() {
    return [{rel: 'stylesheet', href: leaderboardstyles}]
  }