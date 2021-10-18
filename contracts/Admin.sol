// SPDX-License-Identifier: CC BY
pragma solidity ^0.8.7;
import "./SellableOwner.sol";

contract Admin is SellableOwner {
    
    // Off-chain
    
    event OffChainStatus(bool isOnline);
    bool private isOffChainOnline;
    
    function setOnline(bool status) external onlyOwner {
        isOffChainOnline = status;
    }
    
    function isOnline() public view returns (bool) {
        return isOffChainOnline;
    }
    
    //event on config set
    event ConfigSet(Config config);
    
    // todo: make everything uint? include expire? increase betMax and so?
    struct Config {
        uint40 ceilMax; //uin24 aka 16,777,215
        uint96 betMax; //half of an uint96 aka (79,228,162,514,264,337,593,543,950,335) / 2
        uint64 betMin; //uint64 aka 18,446,744,073,709,551,6151
        uint16 cooldown; //uint16 aka 65,535 seconds
        uint40 timeout; //uint25 aka 16,777,215
    }
    
    Config private currentConfig;
    
    function config() internal view returns (Config memory) {
        return currentConfig;
    }
    
    function getConfig() external view returns (Config memory) {
        return currentConfig;
    }
    
    function setConfig(Config calldata c) external onlyOwner {
        require(c.ceilMax > 1 && c.betMin <= c.betMax && c.cooldown <= c.timeout && c.betMax < uint96(2**96 - 1) / 2, "Sanity check failed");
        currentConfig = c;
        emit ConfigSet(c);
    }
    
    // Tax
    
    uint private onChainTax; //to pay for chainlink
    uint private offChainTax; //to pay for AWS
    uint public constant offChainTaxLimit = 6; //16.666%
    uint public constant onChainTaxLimit = 10; //10%

    event TaxSet(bool isOffChainTax, uint denominator);
    
    function setTax(bool isOffChain, uint denominator) external onlyOwner {
        require(denominator >= (isOffChain ? offChainTaxLimit : onChainTaxLimit), "Tax over limit");
        if (isOffChain) {
            offChainTax = denominator;
        } else {
            onChainTax = denominator;
        }
        emit TaxSet(isOffChain, denominator);
    }
    
    function getTax() external view returns (uint onChain, uint offChain) {
        onChain = onChainTax;
        offChain = offChainTax;
    }
    
    function getTax(uint amount, bool isOffChain) internal view returns (uint) {
        return amount / (isOffChain ? offChainTax : onChainTax);
    }
    
    constructor() {
        onChainTax = 20;
        offChainTax = 7;
        
        currentConfig = Config({
            ceilMax: 2**24 - 1, //uin24 aka 16,777,216
            betMax: uint96(2**96 - 1) / 2, //half of an uint96 ca 604462.9 ether
            betMin: 1 * 10**18, //0.1 matic
            cooldown: 10 seconds, //until user is allowed to force roll for other
            timeout: 1 hours //refresh on every roll todo: maybe lower
        });
    }
}