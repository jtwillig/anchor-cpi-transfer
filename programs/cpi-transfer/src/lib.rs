use anchor_lang::prelude::*;
use anchor_spl::token::{Burn, Mint, Token, TokenAccount, Transfer};

declare_id!("7MC15wg6gUMKnzAHb9UA1q2CWBiqKtbFGdLHZxLcdXy5");

#[program]
pub mod cpi_transfer {
    use super::*;
    use anchor_spl::token;

    pub fn transfer(ctx: Context<TransferCtx>, amount: u64) -> Result<()> {
        msg!("initial token amount: {}", ctx.accounts.sender_token.amount);
        token::transfer(ctx.accounts.transfer_ctx(), amount)?;
        ctx.accounts.sender_token.reload()?;
        msg!(
            "remaining token amount: {}",
            ctx.accounts.sender_token.amount
        );
        Ok(())
    }

    pub fn burn(ctx: Context<BurnCtx>, amount: u64) -> Result<()> {
        msg!("initial token amount: {}", ctx.accounts.sender_token.amount);
        token::burn(ctx.accounts.burn_ctx(), amount)?;
        ctx.accounts.sender_token.reload()?;
        msg!(
            "remaining token amount: {}",
            ctx.accounts.sender_token.amount
        );
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
    pub token_program: Program<'info, Token>,
    pub mint: Account<'info, Mint>,
}

impl<'info> TransferCtx<'info> {
    fn transfer_ctx(&self) -> CpiContext<'_, '_, '_, 'info, Transfer<'info>> {
        CpiContext::new(
            self.token_program.to_account_info(),
            Transfer {
                from: self.sender_token.to_account_info(),
                to: self.reciever_token.to_account_info(),
                authority: self.sender.to_account_info(),
            },
        )
    }
}

#[derive(Accounts)]
pub struct BurnCtx<'info> {
    pub sender: Signer<'info>,
    #[account(mut)]
    pub sender_token: Account<'info, TokenAccount>,
    pub token_program: Program<'info, Token>,
    #[account(mut)]
    pub mint: Account<'info, Mint>,
}

impl<'info> BurnCtx<'info> {
    fn burn_ctx(&self) -> CpiContext<'_, '_, '_, 'info, Burn<'info>> {
        CpiContext::new(
            self.token_program.to_account_info(),
            Burn {
                mint: self.mint.to_account_info(),
                from: self.sender_token.to_account_info(),
                authority: self.sender.to_account_info(),
            },
        )
    }
}
