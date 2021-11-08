// SPDX-License-Identifier: CC BY
pragma solidity ^0.8.7;
import "./Errors.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract Config is Ownable, Errors {

    event TaxSet(uint denominator);

    uint private betMin; //PER PLAYER, MAXIMUM: uint(2**256 - 2) / 2 ELSE UNSAFE
    uint private betMax; //PER PLAYER, MAXIMUM: uint(2**256 - 2) / 2 ELSE UNSAFE
    uint private confirmTime;
    uint private expireTime;

    uint private tax;
    uint public constant taxLimit = 10; //10%

    //0.1 * 10**18
    constructor() {
        tax = 20; //5%
        betMax = (2**256 - 2) / 2; //half of bounds
        betMin = 1 * 10**18; // 1 matic (0.005 gas * 10 (avg roll count of match)) / 5 * 100 = 1mat
        confirmTime = 15 seconds; //how long the users have to confirm with off-chain
        expireTime = 10 minutes; //at 15 seconds auto-roll time fully afk match this gives a 40 roll match
    }

    function setTax(uint denominator) external onlyOwner {
        require(denominator >= taxLimit, ERROR_TAX_LIMIT);
        emit TaxSet(denominator);
    }

    function getTax() external view returns (uint) { return tax; }

    function getTax(uint amount) internal view returns (uint) { return amount / tax; }

    function getConfig() external view returns (uint, uint, uint, uint) {
        return (betMax, betMin, confirmTime, expireTime); }

    function getExpireTime() internal view returns (uint) { return expireTime; }

    function getConfirmTime() internal view returns (uint) { return confirmTime; }

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