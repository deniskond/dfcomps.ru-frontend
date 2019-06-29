import { UploadDemoDtoInterface } from '../../../../services/demos/dto/upload-demo.dto';
import { UserInterface } from '../../../../interfaces/user.interface';
import { UserService } from '../../../../services/user-service/user.service';
import { DemosService } from '../../../../services/demos/demos.service';
import { NewsOfflineStartInterface } from '../../../../services/news-service/interfaces/news-offline-start.interface';
import { Component, Input, OnInit, ViewChild, ElementRef } from '@angular/core';
import { CupStates } from '../../../../enums/cup-states.enum';
import * as moment from 'moment';
import { finalize, take, switchMap, catchError } from 'rxjs/operators';
import { Observable, of } from 'rxjs';
import { MatSnackBar } from '@angular/material';

@Component({
    selector: 'app-news-offline-start',
    templateUrl: './news-offline-start.component.html',
    styleUrls: ['./news-offline-start.component.less'],
})
export class NewsOfflineStartComponent implements OnInit {
    @Input()
    news: NewsOfflineStartInterface;

    @ViewChild('fileInput') fileInput: ElementRef;

    public user$: Observable<UserInterface>;
    public cupState: CupStates;
    public cupStates = CupStates;
    public isUploading = false;

    constructor(private demosService: DemosService, private userService: UserService, private snackBar: MatSnackBar) {}

    ngOnInit(): void {
        this.cupState = this.getCupState();
        this.user$ = this.userService.getCurrentUser$();
    }

    public uploadDemo(): void {
        const demo: File = this.fileInput.nativeElement.files[0];

        if (!demo) {
            this.snackBar.open('Error', 'No demo', { duration: 3000 });

            return;
        }

        if (!demo.name.toLowerCase().includes(this.news.cup.map1.toLowerCase())) {
            this.snackBar.open('Error', 'Wrong map', { duration: 3000 });

            return;
        }

        this.isUploading = true;

        this.user$
            .pipe(
                take(1),
                switchMap((user: UserInterface) =>
                    this.demosService.uploadDemo$(demo, this.news.cup.id, this.news.cup.map1, user.id, demo.name),
                ),
                finalize(() => {
                    this.fileInput.nativeElement.value = null;
                    this.isUploading = false;
                }),
                catchError(() => {
                    this.snackBar.open('Error', 'Upload failed', { duration: 3000 });

                    return of();
                }),
            )
            .subscribe(({ status, validation, message }: UploadDemoDtoInterface) => {
                if (status === 'Success') {
                    this.snackBar.open('Success', 'Demo sent', { duration: 3000 });
                } else if (status === 'Error') {
                    this.snackBar.open('Error', message, { duration: 3000 });
                } else if (status === 'Invalid') {
                    // TODO
                }
            });
    }

    private getCupState(): CupStates {
        const startTime = +this.news.cup.startTime;
        const endTime = +this.news.cup.endTime;
        const currentTime = +moment().format('X');

        if (currentTime < startTime) {
            return CupStates.NOT_STARTED;
        }

        if (currentTime > endTime) {
            return CupStates.FINISHED;
        }

        return CupStates.IN_PROGRESS;
    }
}
