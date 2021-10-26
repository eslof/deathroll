// SPDX-License-Identifier: CC BY
pragma solidity ^0.8.7;
import "./Owner.sol";

contract Admin is Owner {
    
    string private constant ERROR_ADMIN_SET = "Already admin";
    string private constant ERROR_ADMIN_UNSET = "Not admin";
    //change to just one admin?
    event AdminAdd(address indexed newAdmin);
    event AdminRemove(address indexed oldAdmin);
    
    mapping(address => bool) private isAdminByAddress;
    
    address[] admins; //5%
    
    modifier onlyAdmin() { require(isAdmin()); _; }
    
    function isAdmin() public view returns (bool) {
        return isAdminByAddress[msg.sender]; }
    
    // cooldown => confirmTime aka how long user has to auth with lambda before match is canceled without coinflip
    
    // open match and request house dealer
    // allowed to cancel match for free if we cannot match the bet (if we can't "find a dealer")
    // non-admin "players" we run once per minute or so to check if we can sneak into an open match
    // get dealer AT PRICE or max dealer
    // lock dealer db ? until confirmed by creating new match with given password ? how know matchid?
    // check for balance and lock if found?
    // match++ to reserve and give client?
    // auto roll at cooldown?
    function getAdmins() external view returns (address[] memory) {
        require(isAdmin() || isOwner());
        return admins; }
    
    function addAdmin(address addr) external onlyOwner {
        require(!isAdminByAddress[addr], ERROR_ADMIN_SET);
        isAdminByAddress[addr] = true;
        admins.push(addr);
        emit AdminAdd(addr); }
    
    function removeAdmin(address addr) external onlyOwner {
        require(admins.length > 0 || isAdminByAddress[addr], ERROR_ADMIN_UNSET);
        if (admins.length == 1 && admins[0] == addr) {
            isAdminByAddress[addr] = false;
            admins.pop();
            return;
        }
        
        for (uint i = 0; i < admins.length-1; i++){
            if (admins[i] != addr) continue;
            admins[i] = admins[i+1];
            admins.pop();
            isAdminByAddress[addr] = false;
            emit AdminRemove(addr);
            return;
        }
    }
}