// SPDX-License-Identifier: CC BY
pragma solidity ^0.8.7;
import "./Owner.sol";

contract Tax is Owner {
    
    string private constant ERROR_TAX_LIMIT = "Tax over limit";
    
    uint private tax;
    uint public constant taxLimit = 10; //16.666%

    event TaxSet(uint denominator);
    
    constructor() { tax = 20; }
    
    function setTax(uint denominator) external onlyOwner {
        require(denominator >= taxLimit, ERROR_TAX_LIMIT);
        emit TaxSet(denominator);
    }

    function getTax() external view returns (uint) { return tax; }
    
    function getTax(uint amount) internal view returns (uint) { return amount / tax; }
}