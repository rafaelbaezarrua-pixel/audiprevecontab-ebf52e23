-- Update existing records to use the recently committed 'simei' enum value
UPDATE empresas SET regime_tributario = 'simei' WHERE regime_tributario = 'mei';
