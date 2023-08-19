use anchor_lang::prelude::*;
use anchor_spl::token::{Mint, Token, TokenAccount, Transfer};

declare_id!("CpePG7eTwd6gq4eAfnJg3DeXBaw8HASypWgZmK1zAuJ3");

#[program]
pub mod cpi_transfer {
    use anchor_spl::token;
    use super::*;

    pub fn transfer(ctx: Context<TransferCtx>, amount: u64) -> Result<()> {
        msg!("initial token amount: {}", ctx.accounts.sender_token.amount);
        token::transfer(ctx.accounts.transfer_ctx(), amount)?;
        ctx.accounts.sender_token.reload()?;
        msg!("remaining token amount: {}", ctx.accounts.sender_token.amount);
        Ok(())
    }
}

#[derive(Accounts)]
pub struct TransferCtx<'info> {
    pub sender: Signer<'info>,
    #[account(mut)]
    pub sender_token: Account<'info, TokenAccount>,
    #[account(mut)]
    pub reciever_token: Account<'info, TokenAccount>,
    pub token_program: Program<'info,Token>,
    pub mint: Account<'info,Mint>
}

impl<'info> TransferCtx<'info>{
    fn transfer_ctx(&self) -> CpiContext<'_, '_, '_, 'info, Transfer<'info>>{
        CpiContext::new(
            self.token_program.to_account_info(),
            Transfer {
                from: self.sender_token.to_account_info(),
                to: self.reciever_token.to_account_info(),
                authority: self.sender.to_account_info(),
            }
        )
    }
}
