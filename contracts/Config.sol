// SPDX-License-Identifier: CC BY
pragma solidity ^0.8.7;
import "./Errors.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract Config is Ownable, Errors {

    event TaxSet(uint denominator);

    uint public betMin; //PER PLAYER, MAXIMUM: uint(2**256 - 2) / 2 ELSE UNSAFE
    uint public betMax; //PER PLAYER, MAXIMUM: uint(2**256 - 2) / 2 ELSE UNSAFE
    uint public confirmTime;
    uint public expireTime;

    uint private _tax;
    uint public constant TAX_LIMIT = 10; //10%

    constructor() {
        _tax = 20; //5%
        betMax = (2**256 - 2) / 2; //half of bounds
        betMin = 1 * 10**18; // 1 matic (0.005 gas * 10 (avg roll count of match)) / 5 * 100 = 1mat
        confirmTime = 15 seconds; //how long the users have to confirm with off-chain
        expireTime = 10 minutes; //at 15 seconds auto-roll time fully afk match this gives a 40 roll match
    }

    function setBetLimits(uint min, uint max) external onlyOwner {
        require(min > 0 && max >= min && max <= (2**256 - 2) / 2, ERROR_SANITY); //per-player
        betMin = min;
        betMax = max;
    }

    function setTax(uint denominator) external onlyOwner {
        require(denominator >= TAX_LIMIT, ERROR_TAX_LIMIT);
        emit taxSet(denominator);
    }

    function setTimeLimits(uint confirm, uint expire) external onlyOwner {
        require(confirm > 0 && expire >= confirm, ERROR_SANITY);
        confirmTime = confirm;
        expireTime = expire;
    }

    function getConfig() external view returns (uint, uint, uint, uint) {
        return (betMax, betMin, confirmTime, expireTime); }

    function getTax() external view returns (uint) { return _tax; }
    function getTax(uint value) internal view returns (uint) { return value / _tax; }
    function requireBetLimit(uint value) internal view { require(betMin <= value && value <= betMax ); }
}