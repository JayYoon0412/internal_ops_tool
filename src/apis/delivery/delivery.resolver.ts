import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { DeliveryService } from './delivery.service';

@Resolver()
export class DeliveryResolver {
  constructor(private readonly deliveryService: DeliveryService) {}

  @Mutation(() => String)
  requestDomesticDelivery() {
    return this.deliveryService.requestDomestic();
  }

  @Mutation(() => String)
  fetchMatchingID(@Args({ name: 'ids', type: () => [String] }) ids: String[]) {
    return this.deliveryService.convertID({ ids });
  }

  @Mutation(() => String)
  cancelOOS(@Args({ name: 'ids', type: () => [String] }) ids: String[]) {
    return this.deliveryService.cancelOrder({ ids, reasonID: 'sold_out' });
  }

  @Mutation(() => String)
  cancelCBU(@Args({ name: 'ids', type: () => [String] }) ids: String) {
    return this.deliveryService.cancelCBU({ filePath: null });
  }
}
