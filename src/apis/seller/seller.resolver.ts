import { Args, Query, Resolver } from '@nestjs/graphql';
import { SellerService } from './seller.service';

@Resolver()
export class SellerResolver {
  constructor(private readonly sellerService: SellerService) {}

  @Query(() => String)
  fetchSellerInformation(
    @Args({ name: 'ids', type: () => [String] }) ids: String[],
  ) {
    return this.sellerService.scrapeContacts({ ids });
  }
}
