export class FindChannelByUserAndNameQuery {
  constructor(
    public readonly userId: string, 
    public readonly name: string
  ) {}
}