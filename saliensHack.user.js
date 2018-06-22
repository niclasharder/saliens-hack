// ==UserScript==
// @name          	Saliens Hack
// @description     Saliens Hack for Steam Summer Sale 2018 Game - AutoSelect Planet, Invincibility, InstaKill
//
// @author	    Niclas Harder
// @namespace       http://github.com/niclasharder
// @downloadURL	    https://github.com/niclasharder/saliens-hack/blob/master/saliensHack.user.js
//
// @include         https://steamcommunity.com/saliengame/play
// @include         https://steamcommunity.com/saliengame/play/
//
// @version         1.1.1
// @updateURL	    https://github.com/niclasharder/saliens-hack/blob/master/saliensHack.user.js
//
// @run-at			document-start|document-end
//
// @grant           unsafeWindow
//
// @unwrap
// ==/UserScript==

/**
 * SCRIPT DESCRIPTION.
 *
 * @see http://wiki.greasespot.net/API_reference
 * @see http://wiki.greasespot.net/Metadata_Block
 */
(function() {	
    if (typeof unsafeWindow !== "undefined")
    	unsafeWindow.requestAnimationFrame = c => { setTimeout(c, 1000 / 60); };

    CEnemy.prototype.Walk = function(){this.Die(true);};
    var joiningZone = false;
    var joiningPlanet = false;
    var gameCheck = function(){
        // Game broke reload and try again
        if ($J('.newmodal .newmodal_header .ellipsis') && $J('.newmodal .newmodal_header .ellipsis').length > 0 && $J('.newmodal .newmodal_header .ellipsis').text() == "Game Error") {
            clearInterval(intervalFunc);
            setTimeout(function() {
                window.location.reload();
            }, 750);
        }
        
        if (!gGame || !gGame.m_State) return;

        if (gGame.m_State instanceof CBootState && gGame.m_State.button) {
            startGame();
            return;
        }

        if (gGame.m_State instanceof CPlanetSelectionState && gGame.m_State.m_rgPlanets) {
            // Go to uncaptured zone with the higheset difficulty
            var uncapturedPlanets = gGame.m_State.m_rgPlanets
                .filter(function(p){ return p.state && !p.state.captured })
                .sort(function(p1, p2){return p2.state.difficulty - p1.state.difficulty});
            
            if (uncapturedPlanets.length == 0) {
                console.log("ALL PLANETS ARE DONE. GG.");
                return;
            }
            
            joinPlanet(uncapturedPlanets[0].id);
            return;
        }

        if (gGame.m_State.m_VictoryScreen || gGame.m_State.m_LevelUpScreen) {
            gGame.ChangeState( new CBattleSelectionState( gGame.m_State.m_PlanetData.id ) );
            console.log('round done');
            return;
        }
	    
	if (gGame.m_State.m_ScoreIncrements && gGame.m_State.m_ScoreIncrements != 0 && gGame.m_State.m_rtBattleStart && gGame.m_State.m_rtBattleEnd) {
		var ptPerSec = (gGame.m_State.m_rtBattleEnd - gGame.m_State.m_rtBattleStart) / 1000;
		gGame.m_State.m_Score = gGame.m_State.m_ScoreIncrements * ptPerSec;
		gGame.m_State.m_ScoreIncrements = 0;
	}

        if (gGame.m_State.m_EnemyManager) {
            joiningZone = false;
            return;
        }

        if (gGame.m_State.m_PlanetData && gGame.m_State.m_PlanetData.zones) {
            joiningPlanet = false;
            // Go to boss in uncaptured zone if there is one
            var bossZone = gGame.m_State.m_PlanetData.zones
                .find(function(z){ return !z.captured && z.boss });
            
            if (bossZone && bossZone.zone_position) {
                console.log('Boss battle at zone:', bossZone.zone_position);
                joinZone(bossZone.zone_position);
                return;
            }
            
            // Go to uncaptured zone with the higheset difficulty
            var uncapturedZones = gGame.m_State.m_PlanetData.zones
                .filter(function(z){ return !z.captured })
                .sort(function(z1, z2){return z2.difficulty - z1.difficulty});
            
            if (uncapturedZones.length == 0 && gGame.m_State.m_PlanetData) {
                console.log("Planet is completely captured.");
                leavePlanet(gGame.m_State.m_PlanetData.id);
                return;
            }

            joinZone(uncapturedZones[0].zone_position);
            return;
        }
    };

    var intervalFunc = setInterval(gameCheck, 100);

    var joinZone = function(zoneId) {
        if (joiningZone) return;
        console.log('Joining zone:', zoneId);

        joiningZone = true;

        clearInterval(intervalFunc);

        gServer.JoinZone(
            zoneId,
            function ( results ) {
                gGame.ChangeState( new CBattleState( gGame.m_State.m_PlanetData, zoneId ) );
            },
            GameLoadError
        );

        setTimeout(function() {
            intervalFunc = setInterval(gameCheck, 100);
        }, 10000);
    };

    var joinPlanet = function(planetId) {
        if (joiningPlanet) return;
        console.log('Joining planet:', planetId);

        joiningPlanet = true;

        clearInterval(intervalFunc);

        gServer.JoinPlanet(
            planetId,
            function ( response ) {
                gGame.ChangeState( new CBattleSelectionState( planetId ) );
            },
            function ( response ) {
                ShowAlertDialog( 'Join Planet Error', 'Failed to join planet.  Please reload your game or try again shortly.' );
            }
        );

        setTimeout(function() {
            intervalFunc = setInterval(gameCheck, 100);
        }, 10000);
    };
    
    var leavePlanet = function(planetDataId) {
       
        if (joiningPlanet) return;
        console.log('Leaving planet:', planetDataId);

        joiningPlanet = true;

        clearInterval(intervalFunc);
        
        gServer.LeaveGameInstance(
			planetDataId,
			function() {
				gGame.ChangeState( new CPlanetSelectionState() );
			}
		);

        setTimeout(function() {
            intervalFunc = setInterval(gameCheck, 100);
        }, 10000);
    };

    var startGame = function() {
        console.log('Pressing Play in 2 seconds');

        clearInterval(intervalFunc);

        // wait 2 seconds for game to load
        // TODO: find a way to do this programmatically
        setTimeout(function() {
            gGame.m_State.button.click();

            setTimeout(function() {
                intervalFunc = setInterval(gameCheck, 100);
            }, 5000);
        }, 2000);
    };
})();
