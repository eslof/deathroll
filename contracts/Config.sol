// SPDX-License-Identifier: CC BY
pragma solidity ^0.8.7;
import "./Owner.sol";

contract Config is Owner {
    
    string private constant ERROR_BOUNDS = "Out of bounds";
    string internal constant ERROR_SANITY = "Sanity check";
    string internal constant ERROR_BET_EXPIRED = "Bet expired";
    string internal constant ERROR_BET_NOT_EXPIRED = "Bet not expired";

    uint betMin; //PER PLAYER, MAXIMUM: uint(2**256 - 2) / 2 ELSE UNSAFE
    uint betMax; //PER PLAYER, MAXIMUM: uint(2**256 - 2) / 2 ELSE UNSAFE
    uint confirmTime;
    uint expireTime;
    
    //0.1 * 10**18
    constructor() {
        betMax = (2**256 - 2) / 2; //half of bounds
        betMin = 0.1 * 10**18; 
        //confirmTime = 15 seconds; //how long the users have to confirm with off-chain
        expireTime = 10 minutes; //at 15 seconds auto-roll time fully afk match this gives a 40 roll match
    }
    
    function getConfig() external view returns (uint, uint, uint, uint) {
        return (betMax, betMin, confirmTime, expireTime);
    }
    
    //once a match is found client will 
    
    //function validate bet et.c.
    
    //game rules here
    
    function getExpireTime() internal view returns (uint) {
        return expireTime;
    }
    
    function getConfirmTime() internal view returns (uint) {
        return confirmTime;
    }
    
    function requireBetLimit(uint bet) internal view { require(betMin <= bet && bet <= betMax ); }
    
    function setBetLimits(uint min, uint max) external onlyOwner {
        require(min > 0 && max >= min && max <= (2**256 - 2) / 2, ERROR_SANITY); //per-player
        betMin = min;
        betMax = max;
    }
    
    function setTimeLimits(uint confirm, uint expire) external onlyOwner {
        require(confirm > 0 && expire >= confirm, ERROR_SANITY);
        confirmTime = confirm;
        expireTime = expire;
    }
}